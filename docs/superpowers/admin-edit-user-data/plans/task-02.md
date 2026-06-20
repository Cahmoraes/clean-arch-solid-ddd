# Task 2: Autorização na edição de nome/email (UpdateUserProfile) [FR-005, FR-006, FR-007, FR-010, FR-011, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** task-01

## Visão Geral

Aplica a `UserManagementPolicy` no `UpdateUserProfileUseCase` (`PATCH /users/:userId`, endpoint admin-facing). Hoje esse use case não valida autorização — qualquer usuário autenticado pode editar o perfil de qualquer outro (bug). Passa a receber `requesterId`, carregar requester + target e consultar `canEditProfile`, retornando `NotAllowedToManageUserError` (403) quando proibido. O controller passa a repassar `req.user.sub.id`.

O self-edit do próprio perfil continua pelo endpoint separado `PATCH /users/me` (não passa pela policy) — esta task adiciona um teste de regressão garantindo que esse caminho não foi afetado (FR-011).

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/update-user-profile.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/update-user-profile.controller.ts`
- Test (modify/create): `apps/backend/src/user/application/use-case/update-user-profile.usecase.test.ts`
- Test (modify/create): `apps/backend/src/user/infra/controller/update-user-profile.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: corrigir a lacuna de autorização de verdade, sem checagem superficial.
- `security-review`: este é o fechamento de um bug de autorização (IDOR) — revisar com rigor.
- `typescript-advanced`: estender o Input do use case e o tipo de retorno (`Either`) corretamente.
- `test-antipatterns`: testes unitários e de fluxo HTTP cobrindo permitido/negado, sem mocks frágeis.

## Passos

- **Step 1: Escrever o teste unitário falho (autorização)**

Em `apps/backend/src/user/application/use-case/update-user-profile.usecase.test.ts`, adicione (mantendo o setup de container/in-memory repository já usado no projeto — ver `promote-to-admin.usecase.test.ts` como referência de `container.snapshot()/rebind/restore`):

```typescript
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { User } from "@/user/domain/user"

// dentro do describe("UpdateUserProfileUseCase"):

test("admin comum não pode editar outro admin (403)", async () => {
  const requester = User.restore({
    id: "admin-id", name: "Admin", email: "admin@test.com",
    password: "hashed", role: "ADMIN", status: "activated",
    createdAt: new Date(), isSuperAdmin: false,
  })
  const target = User.restore({
    id: "other-admin-id", name: "Other", email: "other@test.com",
    password: "hashed", role: "ADMIN", status: "activated",
    createdAt: new Date(), isSuperAdmin: false,
  })
  await userRepository.save(requester)
  await userRepository.save(target)

  const result = await sut.execute({
    requesterId: "admin-id",
    userId: "other-admin-id",
    name: "Hacked",
    email: "hacked@test.com",
  })

  expect(result.isFailure()).toBe(true)
  expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
})

test("admin comum edita um membro com sucesso", async () => {
  const requester = User.restore({
    id: "admin-id", name: "Admin", email: "admin@test.com",
    password: "hashed", role: "ADMIN", status: "activated",
    createdAt: new Date(), isSuperAdmin: false,
  })
  const target = User.restore({
    id: "member-id", name: "Member", email: "member@test.com",
    password: "hashed", role: "MEMBER", status: "activated",
    createdAt: new Date(), isSuperAdmin: false,
  })
  await userRepository.save(requester)
  await userRepository.save(target)

  const result = await sut.execute({
    requesterId: "admin-id",
    userId: "member-id",
    name: "Novo Nome",
    email: "novo@test.com",
  })

  expect(result.isSuccess()).toBe(true)
  const updated = await userRepository.userOfId("member-id")
  expect(updated?.name).toBe("Novo Nome")
})
```

- **Step 2: Rodar e ver falhar**

Run: `pnpm --filter backend test:run -- update-user-profile.usecase`
Expected: FAIL — `execute` ainda não aceita `requesterId` / não retorna `NotAllowedToManageUserError`.

- **Step 3: Implementar a autorização no use case**

Edite `apps/backend/src/user/application/use-case/update-user-profile.usecase.ts`:

```typescript
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"

export interface UpdateUserProfileUseCaseInput {
  requesterId: string
  userId: string
  name: string
  email: string
}

export type UpdateUserProfileUseCaseOutput = Either<
  | UserValidationErrors[]
  | UserValidationErrors
  | UserNotFoundError
  | NotAllowedToManageUserError,
  User
>

@injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: UpdateUserProfileUseCaseInput,
  ): Promise<UpdateUserProfileUseCaseOutput> {
    const requester = await this.userRepository.userOfId(input.requesterId)
    if (!requester) return failure(new NotAllowedToManageUserError())

    const user = await this.userRepository.userOfId(input.userId)
    if (!user) return failure(new UserNotFoundError())

    if (!UserManagementPolicy.canEditProfile(requester, user)) {
      return failure(new NotAllowedToManageUserError())
    }

    const profileUpdateResult = user.updateProfile({
      name: input.name,
      email: input.email,
    })
    if (profileUpdateResult.isFailure()) {
      return failure(profileUpdateResult.value)
    }
    await this.userRepository.update(user)
    return success(user)
  }
}
```

> Mantenha os imports já existentes (`failure`, `success`, `injectable`, `inject`, `USER_TYPES`, `UserRepository`, `UserNotFoundError`, `User`, `UserValidationErrors`). Ajuste apenas o que está acima.

- **Step 4: Rodar e ver passar**

Run: `pnpm --filter backend test:run -- update-user-profile.usecase`
Expected: PASS.

- **Step 5: Passar o `requesterId` no controller**

Edite `apps/backend/src/user/infra/controller/update-user-profile.controller.ts`, no `callback`, a chamada do use case:

```typescript
const profileUpdateResult = await this.updateUserProfile.execute({
  requesterId: req.user.sub.id,
  userId: parseRequestResult.value.userId,
  email: parseBodyResult.value.email,
  name: parseBodyResult.value.name,
})
```

> O acesso `req.user.sub.id` é o mesmo padrão já usado em `demote-from-admin.controller.ts`. Confirme com `sg --pattern 'req.user.sub.$FIELD' --lang ts apps/backend/src/user/infra/controller`.

- **Step 6: Escrever o teste de fluxo HTTP (permitido, negado e regressão do /users/me)**

Em `apps/backend/src/user/infra/controller/update-user-profile.business-flow-test.ts` (siga o padrão de `promote-to-admin.business-flow-test.ts` para subir servidor e autenticar):

```typescript
test("admin comum recebe 403 ao editar outro admin", async () => {
  // autentica como admin comum (token de admin não-root) e tenta editar um admin alvo
  const targetId = randomUUID()
  await createAndSaveUser({ userRepository, id: targetId, email: "target-admin@test.com", role: "ADMIN" })

  const response = await request(fastifyServer.server)
    .patch(UserRoutes.PROFILE.replace(":userId", targetId))
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Hacked", email: "hacked@test.com" })

  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
})

test("admin edita um membro e recebe sucesso", async () => {
  const targetId = randomUUID()
  await createAndSaveUser({ userRepository, id: targetId, email: "member@test.com", role: "MEMBER" })

  const response = await request(fastifyServer.server)
    .patch(UserRoutes.PROFILE.replace(":userId", targetId))
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Novo Nome", email: "novo@test.com" })

  expect([HTTP_STATUS.OK, HTTP_STATUS.CREATED]).toContain(response.status)
  const updated = await userRepository.userOfId(targetId)
  expect(updated?.name).toBe("Novo Nome")
})
```

> O token do `beforeEach` no exemplo de referência autentica um usuário `role: "ADMIN"`. Para o teste do 403, garanta que o requester autenticado seja um admin **não-root** (isSuperAdmin=false) — é o default de `createAndSaveUser`. Confirme a assinatura de `createAndSaveUser` em `apps/backend/test/factory/create-and-save-user.ts`.
> `UserRoutes.PROFILE` é `/users/:userId`; substitua o param como acima ou monte a URL conforme o padrão já usado em outros business-flow tests que usam rota com param.

- **Step 7: Rodar o fluxo HTTP**

Run: `pnpm --filter backend test:business-flow -- update-user-profile`
Expected: PASS.

- **Step 8: Verificar que não há outros chamadores de `UpdateUserProfileUseCase.execute` sem `requesterId`**

Run: `sg --pattern 'updateUserProfile.execute($$$)' --lang ts apps/backend/src`
Também: `sg --pattern '$X.execute($$$)' --lang ts apps/backend/src/user/infra/controller/update-user-profile.controller.ts`
Expected: somente o controller editado no Step 5 chama o use case. Se o endpoint `PATCH /users/me` usar um use case diferente (ex: `UpdateMeUseCase`), confirme que ele NÃO foi alterado (preserva FR-011). Liste o controller de `/users/me` com `sg --pattern 'UserRoutes.ME' --lang ts apps/backend/src`.

- **Step 9: Lint, types e suíte**

Run: `pnpm --filter backend biome:fix` → zero issues
Run: `pnpm --filter backend tsc:check` → zero erros
Run: `pnpm --filter backend test:run -- update-user-profile` → PASS

- **Step 10: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/backend/src/user/application/use-case/update-user-profile.usecase.ts \
        apps/backend/src/user/infra/controller/update-user-profile.controller.ts \
        apps/backend/src/user/application/use-case/update-user-profile.usecase.test.ts \
        apps/backend/src/user/infra/controller/update-user-profile.business-flow-test.ts
git commit -m "feat(user): autoriza edicao de perfil via UserManagementPolicy"
```

## Critérios de Sucesso

- `UpdateUserProfileUseCase` recebe `requesterId`, consulta `canEditProfile` e retorna `NotAllowedToManageUserError` (403) quando proibido (FR-006, FR-010, FR-012).
- Admin comum edita membro com sucesso (FR-005); root edita qualquer um (FR-007) — coberto pela policy da task 1 e pelo fluxo HTTP.
- O endpoint `PATCH /users/me` (self-edit do perfil) permanece inalterado e funcional (FR-011), confirmado no Step 8.
- `biome:fix`, `tsc:check` e os testes unit + business-flow passam.
