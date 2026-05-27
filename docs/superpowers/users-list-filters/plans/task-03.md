# Task 3: Backend — Estender FetchUsersUseCase com filtros role/status [RF-017, RF-018, RF-019, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Estende `FetchUsersUseCaseInput` com `role?` e `status?`, atualiza a cache key para incluir esses campos, e repassa os parâmetros ao `UserDAO`. Adiciona testes para os novos filtros.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/fetch-users.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/fetch-users.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: cache key deve incluir novos campos — nenhum workaround de invalidação
- test-antipatterns: testes adicionais, não substituição dos existentes

## Passos

- [ ] **Step 1: Atualizar FetchUsersUseCase**

Substitua o conteúdo de `apps/backend/src/user/application/use-case/fetch-users.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { FetchUsersOutput, UserDAO } from "../persistence/dao/user-dao"

export interface FetchUsersUseCaseInput {
  page: number
  limit: number
  query?: string
  role?: RoleTypes
  status?: "active" | "inactive"
}

export interface FetchUsersData {
  id: string
  role: RoleTypes
  status: string
  createdAt: string
  name: string
  email: string
}

export interface FetchUsersMeta {
  total: number
  page: number
  limit: number
}

export interface FetchUsersUseCaseOutput {
  data: FetchUsersData[]
  pagination: FetchUsersMeta
}

@injectable()
export class FetchUsersUseCase {
  constructor(
    @inject(USER_TYPES.DAO.User)
    private readonly userDAO: UserDAO,
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public async execute(
    input: FetchUsersUseCaseInput,
  ): Promise<FetchUsersUseCaseOutput> {
    const usersCacheResult = await this.fetchUsersFromCache(input)
    this.logger.info(this, { usersCacheResult })
    if (usersCacheResult) return usersCacheResult
    const usersData = await this.userDAO.fetchAndCountUsers(input)
    void this.saveUserDataToCache(input, usersData).catch((error) => {
      this.logger.warn(this, `Falha ao salvar cache de usuários: ${error}`)
    })
    return {
      data: usersData.usersData,
      pagination: {
        total: usersData.total,
        page: input.page,
        limit: input.limit,
      },
    }
  }

  private async fetchUsersFromCache(
    input: FetchUsersUseCaseInput,
  ): Promise<FetchUsersUseCaseOutput | null> {
    return this.cacheDB.get<FetchUsersUseCaseOutput>(this.createCacheKey(input))
  }

  private createCacheKey(input: FetchUsersUseCaseInput): string {
    return `fetch-users:${input.page}:${input.limit}:${input.query ?? ""}:${input.role ?? ""}:${input.status ?? ""}`
  }

  private async saveUserDataToCache(
    input: FetchUsersUseCaseInput,
    usersData: FetchUsersOutput,
  ): Promise<void> {
    this.cacheDB.set(
      this.createCacheKey(input),
      {
        data: usersData.usersData,
        pagination: {
          total: usersData.total,
          page: input.page,
          limit: input.limit,
        },
      },
      env.TTL,
    )
  }
}
```

- [ ] **Step 2: Adicionar testes para os novos filtros**

Abra `apps/backend/src/user/application/use-case/fetch-users.usecase.test.ts` e adicione os seguintes testes ao final do `describe`, antes do `})` de fechamento:

```typescript
test("Deve filtrar usuários por role MEMBER", async () => {
  userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
  userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })
  const result = await sut.execute({ page: 1, limit: 10, role: "MEMBER" })
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-member")
  expect(result.pagination.total).toBe(1)
})

test("Deve filtrar usuários por role ADMIN", async () => {
  userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
  userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })
  const result = await sut.execute({ page: 1, limit: 10, role: "ADMIN" })
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-admin")
})

test("Deve filtrar usuários ativos (status active)", async () => {
  userDAO.createFakeUser({ id: "u-active", status: StatusTypes.ACTIVATED })
  userDAO.createFakeUser({ id: "u-inactive", status: StatusTypes.SUSPENDED })
  const result = await sut.execute({ page: 1, limit: 10, status: "active" })
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-active")
})

test("Deve filtrar usuários inativos (status inactive)", async () => {
  userDAO.createFakeUser({ id: "u-active", status: StatusTypes.ACTIVATED })
  userDAO.createFakeUser({ id: "u-inactive", status: StatusTypes.SUSPENDED })
  const result = await sut.execute({ page: 1, limit: 10, status: "inactive" })
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-inactive")
})

test("Deve combinar filtro de role com busca por texto", async () => {
  userDAO.createFakeUser({ id: "u-joao-member", name: "João", role: "MEMBER" })
  userDAO.createFakeUser({ id: "u-joao-admin", name: "João", role: "ADMIN" })
  userDAO.createFakeUser({ id: "u-maria-member", name: "Maria", role: "MEMBER" })
  const result = await sut.execute({
    page: 1,
    limit: 10,
    query: "joão",
    role: "MEMBER",
  })
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-joao-member")
})

test("Não deve colidir cache entre filtros diferentes (role diferente)", async () => {
  userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
  userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })
  const members = await sut.execute({ page: 1, limit: 10, role: "MEMBER" })
  const admins = await sut.execute({ page: 1, limit: 10, role: "ADMIN" })
  expect(members.data[0].id).toBe("u-member")
  expect(admins.data[0].id).toBe("u-admin")
})
```

- [ ] **Step 3: Rodar os testes**

```bash
pnpm --filter backend test:run -- -t "FetchUsersUseCase"
```

Esperado: todos os testes PASS (incluindo os anteriores e os novos).

- [ ] **Step 4: Verificar tipos e lint**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix
```

Esperado: zero erros.

## Critérios de Sucesso

- `FetchUsersUseCaseInput` aceita `role?` e `status?`
- Cache key inclui `role` e `status` — sem colisão entre filtros diferentes
- Todos os testes existentes continuam passando
- 6 novos testes passando: filtragem por role, por status, combinado, sem colisão de cache
- `tsc:check` e `biome:fix` passam sem erros
