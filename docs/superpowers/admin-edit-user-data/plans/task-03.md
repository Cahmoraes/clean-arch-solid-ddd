# Task 3: Autorização na alteração de status (Suspend/Activate) [FR-005, FR-006, FR-007, FR-009, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** task-01

## Visão Geral

Aplica a `UserManagementPolicy.canChangeStatus` nos use cases `SuspendUserUseCase` e `ActiveUserUseCase`. Hoje ambos verificam apenas existência do usuário; passam a receber `requesterId`, carregar requester + target e negar (403) quando a regra proíbe — em especial: admin comum não suspende/ativa outro admin (FR-006), o super admin é imune (FR-009), e ninguém age sobre o próprio status. As proteções e o cache existentes são mantidos.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/suspend-user.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/active-user.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/suspend-user.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/activate-user.controller.ts`
- Test (modify/create): `apps/backend/src/user/application/use-case/suspend-user.usecase.test.ts`
- Test (modify/create): `apps/backend/src/user/application/use-case/active-user.usecase.test.ts`
- Test (modify/create): `apps/backend/src/user/infra/controller/suspend-user.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: autorização real em ambos os use cases.
- `security-review`: imunidade do super admin e bloqueio de admin-sobre-admin são críticos.
- `typescript-advanced`: estender Inputs e tipos de retorno `Either` com o novo erro.
- `test-antipatterns`: cobrir permitido/negado/imune sem mocks frágeis; preservar os testes de cache existentes.

## Passos

- **Step 1: Teste falho do SuspendUser (autorização)**

Em `suspend-user.usecase.test.ts` (setup de container in-memory como em `promote-to-admin.usecase.test.ts`):

```typescript
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { User } from "@/user/domain/user"

function restoreUser(id: string, role: "ADMIN" | "MEMBER", isSuperAdmin = false): User {
  return User.restore({
    id, name: `User ${id}`, email: `${id}@test.com`, password: "hashed",
    role, status: "activated", createdAt: new Date(), isSuperAdmin,
  })
}

test("admin comum não suspende outro admin (403)", async () => {
  await userRepository.save(restoreUser("admin-id", "ADMIN"))
  await userRepository.save(restoreUser("other-admin", "ADMIN"))

  const result = await sut.execute({ requesterId: "admin-id", userId: "other-admin" })

  expect(result.isFailure()).toBe(true)
  expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
})

test("ninguém suspende o super admin (403)", async () => {
  await userRepository.save(restoreUser("admin-id", "ADMIN"))
  await userRepository.save(restoreUser("root", "ADMIN", true))

  const result = await sut.execute({ requesterId: "admin-id", userId: "root" })

  expect(result.isFailure()).toBe(true)
  expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
})

test("admin comum suspende um membro com sucesso", async () => {
  await userRepository.save(restoreUser("admin-id", "ADMIN"))
  await userRepository.save(restoreUser("member-id", "MEMBER"))

  const result = await sut.execute({ requesterId: "admin-id", userId: "member-id" })

  expect(result.isSuccess()).toBe(true)
  const updated = await userRepository.userOfId("member-id")
  expect(updated?.status).toBe("suspended")
})
```

Replique os três testes equivalentes em `active-user.usecase.test.ts` (use `restoreUser` com `status: "suspended"` no alvo e verifique `status === "activated"` no sucesso).

- **Step 2: Rodar e ver falhar**

Run: `pnpm --filter backend test:run -- suspend-user.usecase active-user.usecase`
Expected: FAIL — `execute` ainda não aceita `requesterId`.

- **Step 3: Implementar autorização no SuspendUser**

Edite `apps/backend/src/user/application/use-case/suspend-user.usecase.ts`:

```typescript
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"

export interface SuspendUserUseCaseInput {
  requesterId: string
  userId: string
}

export type SuspendUserUseCaseOutput = Promise<
  Either<UserNotFoundError | NotAllowedToManageUserError, null>
>

// dentro de execute(), antes de userFound.suspend():
const requester = await this.userRepository.userOfId(input.requesterId)
if (!requester) return failure(new NotAllowedToManageUserError())

const userFound = await this.userRepository.userOfId(input.userId)
if (!userFound) return failure(new UserNotFoundError())

if (!UserManagementPolicy.canChangeStatus(requester, userFound)) {
  return failure(new NotAllowedToManageUserError())
}

userFound.suspend()
await this.userRepository.update(userFound)
// ... manter as chamadas de cache existentes (deleteByPattern("fetch-users:*"), delete("user-stats"))
return success(null)
```

> `SuspendUserUseCaseOutput` é `Promise<Either<...>>`. Preserve a forma exata já usada no arquivo; apenas acrescente `NotAllowedToManageUserError` ao lado esquerdo do `Either` e o `requesterId` ao Input.

- **Step 4: Implementar autorização no ActiveUser**

Edite `apps/backend/src/user/application/use-case/active-user.usecase.ts` com a mesma estrutura:

```typescript
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"

export interface ActiveUserUseCaseInput {
  requesterId: string
  userId: string
}

export type ActiveUserUseCaseOutput = Promise<
  Either<UserNotFoundError | NotAllowedToManageUserError, null>
>

// dentro de execute():
const requester = await this.userRepository.userOfId(input.requesterId)
if (!requester) return failure(new NotAllowedToManageUserError())

const userFound = await this.userRepository.userOfId(input.userId)
if (!userFound) return failure(new UserNotFoundError())

if (!UserManagementPolicy.canChangeStatus(requester, userFound)) {
  return failure(new NotAllowedToManageUserError())
}

userFound.activate()
await this.userRepository.update(userFound)
// ... manter cache + loginAttemptStore.deleteLock existentes
return success(null)
```

- **Step 5: Rodar e ver passar**

Run: `pnpm --filter backend test:run -- suspend-user.usecase active-user.usecase`
Expected: PASS.

- **Step 6: Passar `requesterId` nos controllers**

Em `suspend-user.controller.ts`:

```typescript
const result = await this.suspendUser.execute({
  requesterId: req.user.sub.id,
  userId: parseBodyResult.value.userId,
})
```

Em `activate-user.controller.ts`:

```typescript
const result = await this.activeUser.execute({
  requesterId: req.user.sub.id,
  userId: parseBodyResult.value.userId,
})
```

- **Step 7: Teste de fluxo HTTP (suspend)**

Em `suspend-user.business-flow-test.ts` (padrão de `promote-to-admin.business-flow-test.ts`):

```typescript
test("admin comum recebe 403 ao suspender outro admin", async () => {
  const targetId = randomUUID()
  await createAndSaveUser({ userRepository, id: targetId, email: "admin-target@test.com", role: "ADMIN" })

  const response = await request(fastifyServer.server)
    .patch(UserRoutes.SUSPEND_USER)
    .set("Authorization", `Bearer ${token}`)
    .send({ userId: targetId })

  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
})

test("admin suspende um membro com sucesso", async () => {
  const targetId = randomUUID()
  await createAndSaveUser({ userRepository, id: targetId, email: "member@test.com", role: "MEMBER" })

  const response = await request(fastifyServer.server)
    .patch(UserRoutes.SUSPEND_USER)
    .set("Authorization", `Bearer ${token}`)
    .send({ userId: targetId })

  expect(response.status).toBe(HTTP_STATUS.OK)
})
```

- **Step 8: Rodar o fluxo HTTP**

Run: `pnpm --filter backend test:business-flow -- suspend-user`
Expected: PASS.

- **Step 9: Verificar chamadores e suítes existentes**

Run: `sg --pattern 'suspendUser.execute($$$)' --lang ts apps/backend/src`
Run: `sg --pattern 'activeUser.execute($$$)' --lang ts apps/backend/src`
Expected: somente os controllers editados chamam os use cases. Atualize qualquer outro chamador encontrado para passar `requesterId`.

Run: `pnpm --filter backend test:run -- suspend-user active-user`
Expected: PASS (incluindo os testes de cache pré-existentes — não os remova).

- **Step 10: Lint, types**

Run: `pnpm --filter backend biome:fix` → zero issues
Run: `pnpm --filter backend tsc:check` → zero erros

- **Step 11: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/backend/src/user/application/use-case/suspend-user.usecase.ts \
        apps/backend/src/user/application/use-case/active-user.usecase.ts \
        apps/backend/src/user/infra/controller/suspend-user.controller.ts \
        apps/backend/src/user/infra/controller/activate-user.controller.ts \
        apps/backend/src/user/application/use-case/suspend-user.usecase.test.ts \
        apps/backend/src/user/application/use-case/active-user.usecase.test.ts \
        apps/backend/src/user/infra/controller/suspend-user.business-flow-test.ts
git commit -m "feat(user): autoriza mudanca de status via UserManagementPolicy"
```

## Critérios de Sucesso

- Suspend e Activate recebem `requesterId`, consultam `canChangeStatus` e retornam 403 quando proibido (FR-006, FR-012).
- Admin comum altera status de membro (FR-005); root altera de qualquer um (FR-007); super admin é imune (FR-009).
- Testes de cache pré-existentes continuam passando.
- `biome:fix`, `tsc:check`, unit e business-flow passam.
