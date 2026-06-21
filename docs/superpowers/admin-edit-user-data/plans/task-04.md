# Task 4: Autorização na alteração de role (Promote/Demote, root-only) [FR-006, FR-007, FR-008, FR-009, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** task-01

## Visão Geral

Aplica a `UserManagementPolicy.canChangeRole` nos use cases `PromoteToAdminUseCase` e `DemoteFromAdminUseCase`, tornando a alteração de role **exclusiva do root** (FR-008). Hoje promote/demote são `onlyAdmin` (qualquer admin) — esta task muda o comportamento: um admin comum passa a receber 403. As proteções existentes (super admin imune, anti self-demotion) são mantidas. `DemoteFromAdmin` já recebe `requesterId`; `PromoteToAdmin` passa a receber.

**Atenção (mudança de contrato):** testes existentes que assumiam promote/demote por admin comum precisam ser atualizados para refletir a nova regra root-only.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/promote-to-admin.controller.ts`
- Test (modify): `apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts`
- Test (modify): `apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts`
- Test (modify): `apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: autorização root-only real.
- `security-review`: elevação de privilégio (criar admins) é a operação mais sensível — revisar.
- `refactoring`: ajustar testes existentes que mudaram de comportamento sem perder cobertura.
- `typescript-advanced`: estender Input/Output com o novo erro.
- `test-antipatterns`: atualizar (não deletar) os testes afetados; cobrir o novo caso root-only.

## Passos

- **Step 1: Atualizar/escrever testes do PromoteToAdmin (root-only)**

Em `promote-to-admin.usecase.test.ts`, o setup já injeta o use case via container. Adicione/ajuste:

```typescript
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { User } from "@/user/domain/user"

function restoreUser(id: string, role: "ADMIN" | "MEMBER", isSuperAdmin = false, status: "activated" | "suspended" = "activated"): User {
  return User.restore({
    id, name: `User ${id}`, email: `${id}@test.com`, password: "hashed",
    role, status, createdAt: new Date(), isSuperAdmin,
  })
}

test("admin comum não pode promover (403, root-only)", async () => {
  await userRepository.save(restoreUser("admin-id", "ADMIN"))
  await userRepository.save(restoreUser("member-id", "MEMBER"))

  const result = await sut.execute({ requesterId: "admin-id", userId: "member-id" })

  expect(result.isFailure()).toBe(true)
  expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
})

test("root promove um membro a admin", async () => {
  await userRepository.save(restoreUser("root", "ADMIN", true))
  await userRepository.save(restoreUser("member-id", "MEMBER"))

  const result = await sut.execute({ requesterId: "root", userId: "member-id" })

  expect(result.isSuccess()).toBe(true)
  const updated = await userRepository.userOfId("member-id")
  expect(updated?.role).toBe("ADMIN")
})
```

Ajuste os testes pré-existentes (ex: "Deve promover um membro ativo a administrador") para usar `requesterId: "root"` com um requester root salvo — caso contrário passam a falhar com 403. Mantenha os testes de `UserNotFoundError`, `UserIsSuperAdminError`, `UserIsNotActiveError` e cache, adicionando um requester root válido ao input.

- **Step 2: Atualizar/escrever testes do DemoteFromAdmin (root-only)**

Em `demote-from-admin.usecase.test.ts` (o use case já recebe `requesterId`):

```typescript
test("admin comum não pode rebaixar (403, root-only)", async () => {
  await userRepository.save(restoreUser("admin-id", "ADMIN"))
  await userRepository.save(restoreUser("target-admin", "ADMIN"))

  const result = await sut.execute({ requesterId: "admin-id", userId: "target-admin" })

  expect(result.isFailure()).toBe(true)
  expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
})

test("root rebaixa um admin a membro", async () => {
  await userRepository.save(restoreUser("root", "ADMIN", true))
  await userRepository.save(restoreUser("target-admin", "ADMIN"))

  const result = await sut.execute({ requesterId: "root", userId: "target-admin" })

  expect(result.isSuccess()).toBe(true)
  const updated = await userRepository.userOfId("target-admin")
  expect(updated?.role).toBe("MEMBER")
})
```

Preserve os testes existentes de `CannotDemoteSelfError`, `UserIsSuperAdminError`, `UserIsNotAdminError` e `UserNotFoundError`, garantindo um requester root salvo no input.

- **Step 3: Rodar e ver falhar**

Run: `pnpm --filter backend test:run -- promote-to-admin.usecase demote-from-admin.usecase`
Expected: FAIL — promote ainda não aceita `requesterId`/policy; demote ainda não consulta a policy.

- **Step 4: Implementar autorização no PromoteToAdmin**

Edite `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`:

```typescript
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"

export interface PromoteToAdminUseCaseInput {
  requesterId: string
  userId: string
}

export type PromoteToAdminUseCaseOutput = Promise<
  Either<
    | UserNotFoundError
    | UserAlreadyAdminError
    | UserIsNotActiveError
    | UserIsSuperAdminError
    | NotAllowedToManageUserError,
    null
  >
>

// dentro de execute():
const requester = await this.userRepository.userOfId(input.requesterId)
if (!requester) return failure(new NotAllowedToManageUserError())

const user = await this.userRepository.userOfId(input.userId)
if (!user) return failure(new UserNotFoundError())
if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())

if (!UserManagementPolicy.canChangeRole(requester, user)) {
  return failure(new NotAllowedToManageUserError())
}

if (!user.isActive) return failure(new UserIsNotActiveError())
if (user.role === "ADMIN") return failure(new UserAlreadyAdminError())

user.updateRole("ADMIN")
await this.userRepository.update(user)
// ... manter as invalidações de cache existentes
return success(null)
```

- **Step 5: Implementar autorização no DemoteFromAdmin**

Edite `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts` adicionando a consulta à policy logo após carregar o usuário e checar super admin:

```typescript
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"

// adicionar ao Either de saída: | NotAllowedToManageUserError

// dentro de execute(), após `if (input.userId === input.requesterId) return failure(new CannotDemoteSelfError())`:
const requester = await this.userRepository.userOfId(input.requesterId)
if (!requester) return failure(new NotAllowedToManageUserError())

const user = await this.userRepository.userOfId(input.userId)
if (!user) return failure(new UserNotFoundError())
if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())

if (!UserManagementPolicy.canChangeRole(requester, user)) {
  return failure(new NotAllowedToManageUserError())
}

if (user.role !== "ADMIN") return failure(new UserIsNotAdminError())

user.updateRole("MEMBER")
await this.userRepository.update(user)
// ... manter invalidações de cache existentes
return success(null)
```

- **Step 6: Rodar e ver passar**

Run: `pnpm --filter backend test:run -- promote-to-admin.usecase demote-from-admin.usecase`
Expected: PASS.

- **Step 7: Passar `requesterId` no controller do Promote**

Em `promote-to-admin.controller.ts`:

```typescript
const result = await this.promoteToAdmin.execute({
  requesterId: req.user.sub.id,
  userId: parseBodyResult.value.userId,
})
```

> O `demote-from-admin.controller.ts` já passa `requesterId: req.user.sub.id` — não precisa mudar.

- **Step 8: Atualizar o teste de fluxo HTTP do Promote**

Em `promote-to-admin.business-flow-test.ts`, o `beforeEach` autentica um admin. Como agora promote é root-only, ajuste:
- O teste "Deve promover membro ativo e responder 200" deve autenticar como **root** (crie o usuário autenticado com `isSuperAdmin: true`). Verifique a assinatura de `createAndSaveUser` (`apps/backend/test/factory/create-and-save-user.ts`) para saber como setar `isSuperAdmin`/role; se a factory não suportar `isSuperAdmin`, use `userRepository.save(User.restore({ ..., isSuperAdmin: true }))` para o usuário autenticado.
- Adicione um teste: admin comum (não-root) autenticado recebe **403** ao tentar promover:

```typescript
test("admin comum (não-root) recebe 403 ao promover", async () => {
  // 'token' do beforeEach é de um admin não-root
  const targetId = randomUUID()
  await createAndSaveUser({ userRepository, id: targetId, email: "member@promote.test", role: "MEMBER" })

  const response = await request(fastifyServer.server)
    .patch(UserRoutes.PROMOTE_TO_ADMIN)
    .set("Authorization", `Bearer ${token}`)
    .send({ userId: targetId })

  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
})
```

- **Step 9: Rodar o fluxo HTTP**

Run: `pnpm --filter backend test:business-flow -- promote-to-admin`
Expected: PASS.

- **Step 10: Verificar chamadores e suíte completa de role**

Run: `sg --pattern 'promoteToAdmin.execute($$$)' --lang ts apps/backend/src`
Run: `sg --pattern 'demoteFromAdmin.execute($$$)' --lang ts apps/backend/src`
Expected: somente os controllers. Atualize qualquer outro chamador para incluir `requesterId`.

Run: `pnpm --filter backend test:run -- promote-to-admin demote-from-admin`
Expected: PASS.

- **Step 11: Lint, types**

Run: `pnpm --filter backend biome:fix` → zero issues
Run: `pnpm --filter backend tsc:check` → zero erros

- **Step 12: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts \
        apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts \
        apps/backend/src/user/infra/controller/promote-to-admin.controller.ts \
        apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts \
        apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts \
        apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts
git commit -m "feat(user): torna alteracao de role exclusiva do root"
```

## Critérios de Sucesso

- Promote e Demote consultam `canChangeRole` e só permitem o root (FR-008); admin comum recebe 403 (FR-006, FR-012).
- Super admin permanece imune (FR-009) e anti self-demotion preservado.
- Testes existentes atualizados para o comportamento root-only sem perder cobertura.
- `biome:fix`, `tsc:check`, unit e business-flow passam.
