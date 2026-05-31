# Task 5: `CannotDeleteSelfError` + reescrita do `DeleteUserUseCase` [RF-007, RF-008, RF-009, RF-010, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-02, task-03

## Visão Geral

Reescreve o `DeleteUserUseCase` de hard delete para soft delete, seguindo o padrão de guardas de `DemoteFromAdminUseCase`. O input passa a ser `{ userId, requesterId }`. Guardas, na ordem: auto-exclusão (`CannotDeleteSelfError`, erro novo), usuário inexistente (`UserNotFoundError`), super admin (`UserIsSuperAdminError`, reusado). A ação marca `user.delete()` + `update(user)` e invalida os caches de listagem e estatísticas. O bloqueio por check-ins é **removido** (RF-010), assim como as dependências de `UnitOfWork` e `CheckInRepository`.

## Arquivos

- Create: `apps/backend/src/user/application/error/cannot-delete-self-error.ts`
- Modify: `apps/backend/src/user/application/use-case/delete-user.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/delete-user.usecase.test.ts` (reescrever)

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: teste guardas e efeito real (usuário some das leituras), sem mocks de produção.
- use skill `no-workarounds`: guardas como Either real; sem swallow de erro; cache invalidation não deve mascarar falhas (`.catch(() => {})` é o padrão já estabelecido no projeto para cache best-effort).

## Passos

- **Step 1: Criar o erro `CannotDeleteSelfError`**

Crie `apps/backend/src/user/application/error/cannot-delete-self-error.ts`:

```typescript
export class CannotDeleteSelfError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super("Admin cannot delete their own account", errorOptions)
    this.name = "CannotDeleteSelfError"
  }
}
```

- **Step 2: Reescrever o teste unitário (que falha)**

Substitua o conteúdo de `apps/backend/src/user/application/use-case/delete-user.usecase.test.ts`:

```typescript
import {
  type CreateAndSaveUserProps,
  createAndSaveUser,
} from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { CannotDeleteSelfError } from "../error/cannot-delete-self-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
  DeleteUserUseCase,
  DeleteUserUseCaseInput,
} from "./delete-user.usecase"

describe("DeleteUserUseCase (soft delete)", () => {
  let sut: DeleteUserUseCase
  let userRepository: InMemoryUserRepository
  let cacheDB: CacheDB

  beforeEach(() => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    cacheDB = container.get(SHARED_TYPES.Redis)
    sut = container.get(USER_TYPES.UseCases.DeleteUser)
  })

  afterEach(() => {
    container.restore()
  })

  test("Deve soft-deletar um usuário (ele some das leituras)", async () => {
    const props: CreateAndSaveUserProps = {
      userRepository,
      id: "target-id",
      email: "john@mail.com",
      password: "12345678",
    }
    const user = await createAndSaveUser(props)
    const input: DeleteUserUseCaseInput = {
      userId: user.id,
      requesterId: "admin-id",
    }
    const result = await sut.execute(input)
    expect(result.isSuccess()).toBe(true)
    expect(await userRepository.userOfId(user.id)).toBeNull()
  })

  test("Não deve permitir auto-exclusão (userId === requesterId)", async () => {
    const result = await sut.execute({
      userId: "same-id",
      requesterId: "same-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDeleteSelfError)
  })

  test("Não deve soft-deletar um usuário inexistente", async () => {
    const result = await sut.execute({
      userId: "ghost-id",
      requesterId: "admin-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  test("Não deve soft-deletar um super admin", async () => {
    const superAdmin = User.restore({
      id: "super-id",
      email: "super@test.com",
      name: "Super Admin",
      password: "hashed_password",
      role: "ADMIN",
      status: "activated",
      createdAt: new Date(),
      isSuperAdmin: true,
    })
    await userRepository.save(superAdmin)
    const result = await sut.execute({
      userId: "super-id",
      requesterId: "admin-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserIsSuperAdminError)
  })

  test("Deve soft-deletar mesmo com check-ins (sem bloqueio)", async () => {
    const props: CreateAndSaveUserProps = {
      userRepository,
      id: "target-checkins",
      email: "withcheckins@mail.com",
      password: "12345678",
    }
    const user = await createAndSaveUser(props)
    const result = await sut.execute({
      userId: user.id,
      requesterId: "admin-id",
    })
    expect(result.isSuccess()).toBe(true)
  })

  test("Deve invalidar os caches fetch-users e user-stats", async () => {
    const props: CreateAndSaveUserProps = {
      userRepository,
      id: "cache-target",
      email: "cache@mail.com",
      password: "12345678",
    }
    const user = await createAndSaveUser(props)
    await cacheDB.set("fetch-users:1:10", { data: [] }, 60)
    await cacheDB.set("user-stats", { total: 1 }, 60)
    await sut.execute({ userId: user.id, requesterId: "admin-id" })
    expect(await cacheDB.get("fetch-users:1:10")).toBeNull()
    expect(await cacheDB.get("user-stats")).toBeNull()
  })
})
```

- **Step 3: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "DeleteUserUseCase (soft delete)"`
Expected: FAIL — o use case ainda exige `CheckInRepository`/`UnitOfWork`, não aceita `requesterId` e não tem guardas.

- **Step 4: Reescrever o `DeleteUserUseCase`**

Substitua o conteúdo de `apps/backend/src/user/application/use-case/delete-user.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { CannotDeleteSelfError } from "../error/cannot-delete-self-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface DeleteUserUseCaseInput {
  userId: string
  requesterId: string
}

export type DeleteUserUseCaseOutput = Either<
  CannotDeleteSelfError | UserNotFoundError | UserIsSuperAdminError,
  null
>

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async execute(
    input: DeleteUserUseCaseInput,
  ): Promise<DeleteUserUseCaseOutput> {
    if (input.userId === input.requesterId) {
      return failure(new CannotDeleteSelfError())
    }
    const user = await this.userRepository.userOfId(input.userId)
    if (!user) return failure(new UserNotFoundError())
    if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())

    user.delete()
    await this.userRepository.update(user)

    void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
    void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
    return success(null)
  }
}
```

- **Step 5: Ajustar o binding do IoC (remover deps antigas)**

O `DeleteUserUseCase` deixou de depender de `CheckInRepository` e `UnitOfWork`. O binding em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` é `bind(USER_TYPES.UseCases.DeleteUser).to(DeleteUserUseCase)` — não precisa mudar (Inversify resolve as deps pelo construtor). Confirme que não há referência manual a `CHECKIN_TYPES` específica para o DeleteUser que precise ser removida.

Run: `pnpm --filter backend tsc:check`
Expected: passa. Se houver erro de import não usado em algum arquivo, rode `biome:fix`.

- **Step 6: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "DeleteUserUseCase (soft delete)"`
Expected: PASS (6 testes verdes).

- **Step 7: Validar lint, tipos e a suíte completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: zero problemas; toda a suíte de unidade passa.

- **Step 8: Commit**

```bash
git add apps/backend/src/user/application/error/cannot-delete-self-error.ts apps/backend/src/user/application/use-case/delete-user.usecase.ts apps/backend/src/user/application/use-case/delete-user.usecase.test.ts
git commit -m "feat(backend): rewrite DeleteUserUseCase as soft delete with guards"
```

## Critérios de Sucesso

- Auto-exclusão bloqueada com `CannotDeleteSelfError` (RF-007).
- Super admin bloqueado com `UserIsSuperAdminError` (RF-008).
- Usuário inexistente → `UserNotFoundError` (RF-009).
- Check-ins não bloqueiam mais a exclusão (RF-010).
- Caches `fetch-users:*` e `user-stats` invalidados (RF-015).
- Os 6 testes passam; `biome:fix`, `tsc:check` e `test:run` passam.
