# Task 2: Backend — `PromoteToAdminUseCase` + Testes Unitários [RF-001, RF-004, RF-005, RF-006, RF-007]

**Status:** PENDING
**PRD:** `../prd/prd-admin-role-management.md`
**Spec:** `../specs/admin-role-management-design.md`

## Visão Geral

Cria o `PromoteToAdminUseCase` — responsável por promover um membro ativo ao papel de administrador — com todas as validações de domínio e testes unitários cobrindo os cenários de sucesso e falha.

## Arquivos

- Create: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escrever o teste falho antes da implementação
- no-workarounds: validações explícitas, sem atalhos no Either

## Passos

- [ ] **Step 1: Escrever o arquivo de teste falho**

Crie `apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts`:

```typescript
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { UserAlreadyAdminError } from "../error/user-already-admin-error"
import { UserIsNotActiveError } from "../error/user-is-not-active-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
  PromoteToAdminUseCase,
  PromoteToAdminUseCaseInput,
} from "./promote-to-admin.usecase"

describe("PromoteToAdminUseCase", () => {
  let sut: PromoteToAdminUseCase
  let userRepository: InMemoryUserRepository
  let cacheDB: CacheDB

  beforeEach(async () => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    cacheDB = container.get(SHARED_TYPES.Redis)
    sut = container.get(USER_TYPES.UseCases.PromoteToAdmin)
  })

  afterEach(() => {
    container.restore()
  })

  test("Deve promover um membro ativo a administrador", async () => {
    const input: PromoteToAdminUseCaseInput = { userId: "member-id" }
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

    const result = await sut.execute(input)

    expect(result.isSuccess()).toBe(true)
    const updated = await userRepository.userOfId("member-id")
    expect(updated?.role).toBe("ADMIN")
  })

  test("Não deve promover usuário inexistente", async () => {
    const result = await sut.execute({ userId: "ghost-id" })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  test("Não deve promover admin@admin.com (super admin protegido)", async () => {
    const user = (
      await User.create({
        id: "super-id",
        email: "admin@admin.com",
        name: "Super Admin",
        password: "password",
        role: "MEMBER",
      })
    ).forceSuccess().value
    await userRepository.save(user)

    const result = await sut.execute({ userId: "super-id" })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserIsSuperAdminError)
  })

  test("Não deve promover usuário suspenso", async () => {
    const user = (
      await User.create({
        id: "suspended-id",
        email: "suspended@test.com",
        name: "Suspended",
        password: "password",
        role: "MEMBER",
      })
    ).forceSuccess().value
    user.suspend()
    await userRepository.save(user)

    const result = await sut.execute({ userId: "suspended-id" })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserIsNotActiveError)
  })

  test("Não deve promover usuário que já é admin", async () => {
    const user = (
      await User.create({
        id: "admin-id",
        email: "already@admin.com",
        name: "Already Admin",
        password: "password",
        role: "ADMIN",
      })
    ).forceSuccess().value
    await userRepository.save(user)

    const result = await sut.execute({ userId: "admin-id" })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserAlreadyAdminError)
  })

  test("Deve invalidar o cache fetch-users após promover", async () => {
    const user = (
      await User.create({
        id: "cache-test-id",
        email: "cache@test.com",
        name: "Cache Test",
        password: "password",
        role: "MEMBER",
      })
    ).forceSuccess().value
    await userRepository.save(user)
    await cacheDB.set("fetch-users:1:10", { data: [] }, 60)

    await sut.execute({ userId: "cache-test-id" })

    const cached = await cacheDB.get("fetch-users:1:10")
    expect(cached).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
pnpm --filter backend test:run -- -t "PromoteToAdminUseCase"
```

Esperado: FAIL — `PromoteToAdminUseCase` não existe ainda.

- [ ] **Step 3: Criar o Use Case**

Crie `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserAlreadyAdminError } from "../error/user-already-admin-error"
import { UserIsNotActiveError } from "../error/user-is-not-active-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

const SUPER_ADMIN_EMAIL = "admin@admin.com"

export interface PromoteToAdminUseCaseInput {
  userId: string
}

export type PromoteToAdminUseCaseOutput = Promise<
  Either<
    | UserNotFoundError
    | UserAlreadyAdminError
    | UserIsNotActiveError
    | UserIsSuperAdminError,
    null
  >
>

@injectable()
export class PromoteToAdminUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async execute(
    input: PromoteToAdminUseCaseInput,
  ): PromoteToAdminUseCaseOutput {
    const user = await this.userRepository.userOfId(input.userId)
    if (!user) return failure(new UserNotFoundError())
    if (user.email === SUPER_ADMIN_EMAIL) return failure(new UserIsSuperAdminError())
    if (!user.isActive) return failure(new UserIsNotActiveError())
    if (user.role === "ADMIN") return failure(new UserAlreadyAdminError())

    user.updateRole("ADMIN")
    await this.userRepository.update(user)
    void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
    return success(null)
  }
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "PromoteToAdminUseCase"
```

Esperado: 6 testes passam (PASS).

- [ ] **Step 5: Rodar a suite completa para garantir regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
cd apps/backend
git add src/user/application/use-case/promote-to-admin.usecase.ts \
  src/user/application/use-case/promote-to-admin.usecase.test.ts
git commit -m "feat(user): add PromoteToAdminUseCase with unit tests"
```

## Critérios de Sucesso

- Promoção de membro ativo → role = "ADMIN" e cache invalidado [RF-001]
- UserNotFoundError para usuário inexistente
- UserIsSuperAdminError para admin@admin.com [RF-006]
- UserIsNotActiveError para suspensos [RF-004]
- UserAlreadyAdminError para quem já é admin [RF-005]
- Todos os 6 testes passam
