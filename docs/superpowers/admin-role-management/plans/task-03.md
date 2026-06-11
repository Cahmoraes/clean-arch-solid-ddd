# Task 3: Backend — `DemoteFromAdminUseCase` + Testes Unitários [RF-008, RF-011, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-admin-role-management.md`
**Spec:** `../specs/admin-role-management-design.md`

## Visão Geral

Cria o `DemoteFromAdminUseCase` — responsável por revogar privilégios de administrador de um usuário, retornando-o ao papel de membro — com todas as validações de domínio e testes unitários.

## Arquivos

- Create: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escrever o teste falho antes da implementação
- no-workarounds: validações explícitas, verificação de auto-demoção primeiro

## Passos

- [ ] **Step 1: Escrever o arquivo de teste falho**

Crie `apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts`:

```typescript
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { CannotDemoteSelfError } from "../error/cannot-demote-self-error"
import { UserIsNotAdminError } from "../error/user-is-not-admin-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
  DemoteFromAdminUseCase,
  DemoteFromAdminUseCaseInput,
} from "./demote-from-admin.usecase"

describe("DemoteFromAdminUseCase", () => {
  let sut: DemoteFromAdminUseCase
  let userRepository: InMemoryUserRepository
  let cacheDB: CacheDB

  beforeEach(async () => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    cacheDB = container.get(SHARED_TYPES.Redis)
    sut = container.get(USER_TYPES.UseCases.DemoteFromAdmin)
  })

  afterEach(() => {
    container.restore()
  })

  test("Deve demover um administrador a membro", async () => {
    const user = (
      await User.create({
        id: "admin-id",
        email: "admin@test.com",
        name: "Admin User",
        password: "password",
        role: "ADMIN",
      })
    ).forceSuccess().value
    await userRepository.save(user)

    const input: DemoteFromAdminUseCaseInput = {
      userId: "admin-id",
      requesterId: "requester-id",
    }
    const result = await sut.execute(input)

    expect(result.isSuccess()).toBe(true)
    const updated = await userRepository.userOfId("admin-id")
    expect(updated?.role).toBe("MEMBER")
  })

  test("Não deve demover usuário inexistente", async () => {
    const result = await sut.execute({
      userId: "ghost-id",
      requesterId: "requester-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  test("Não deve permitir auto-demoção (userId === requesterId)", async () => {
    const result = await sut.execute({
      userId: "same-id",
      requesterId: "same-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDemoteSelfError)
  })

  test("Não deve demover admin@admin.com (super admin protegido)", async () => {
    const user = (
      await User.create({
        id: "super-id",
        email: "admin@admin.com",
        name: "Super Admin",
        password: "password",
        role: "ADMIN",
      })
    ).forceSuccess().value
    await userRepository.save(user)

    const result = await sut.execute({
      userId: "super-id",
      requesterId: "requester-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserIsSuperAdminError)
  })

  test("Não deve demover usuário que não é admin", async () => {
    const user = (
      await User.create({
        id: "member-id",
        email: "member@test.com",
        name: "Member",
        password: "password",
        role: "MEMBER",
      })
    ).forceSuccess().value
    await userRepository.save(user)

    const result = await sut.execute({
      userId: "member-id",
      requesterId: "requester-id",
    })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserIsNotAdminError)
  })

  test("Deve invalidar o cache fetch-users após demover", async () => {
    const user = (
      await User.create({
        id: "cache-admin-id",
        email: "cache-admin@test.com",
        name: "Cache Admin",
        password: "password",
        role: "ADMIN",
      })
    ).forceSuccess().value
    await userRepository.save(user)
    await cacheDB.set("fetch-users:1:10", { data: [] }, 60)

    await sut.execute({ userId: "cache-admin-id", requesterId: "requester-id" })

    const cached = await cacheDB.get("fetch-users:1:10")
    expect(cached).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
pnpm --filter backend test:run -- -t "DemoteFromAdminUseCase"
```

Esperado: FAIL — `DemoteFromAdminUseCase` não existe ainda.

- [ ] **Step 3: Criar o Use Case**

Crie `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { CannotDemoteSelfError } from "../error/cannot-demote-self-error"
import { UserIsNotAdminError } from "../error/user-is-not-admin-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

const SUPER_ADMIN_EMAIL = "admin@admin.com"

export interface DemoteFromAdminUseCaseInput {
  userId: string
  requesterId: string
}

export type DemoteFromAdminUseCaseOutput = Promise<
  Either<
    | UserNotFoundError
    | UserIsNotAdminError
    | UserIsSuperAdminError
    | CannotDemoteSelfError,
    null
  >
>

@injectable()
export class DemoteFromAdminUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async execute(
    input: DemoteFromAdminUseCaseInput,
  ): DemoteFromAdminUseCaseOutput {
    if (input.userId === input.requesterId) {
      return failure(new CannotDemoteSelfError())
    }

    const user = await this.userRepository.userOfId(input.userId)
    if (!user) return failure(new UserNotFoundError())
    if (user.email === SUPER_ADMIN_EMAIL) return failure(new UserIsSuperAdminError())
    if (user.role !== "ADMIN") return failure(new UserIsNotAdminError())

    user.updateRole("MEMBER")
    await this.userRepository.update(user)
    void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
    return success(null)
  }
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "DemoteFromAdminUseCase"
```

Esperado: 6 testes passam (PASS).

- [ ] **Step 5: Rodar a suite completa**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
cd apps/backend
git add src/user/application/use-case/demote-from-admin.usecase.ts \
  src/user/application/use-case/demote-from-admin.usecase.test.ts
git commit -m "feat(user): add DemoteFromAdminUseCase with unit tests"
```

## Critérios de Sucesso

- Demoção de admin → role = "MEMBER" e cache invalidado [RF-008]
- CannotDemoteSelfError quando userId === requesterId [RF-011]
- UserIsSuperAdminError para admin@admin.com [RF-012]
- UserIsNotAdminError para usuário que não é admin
- UserNotFoundError para usuário inexistente
- Todos os 6 testes passam
