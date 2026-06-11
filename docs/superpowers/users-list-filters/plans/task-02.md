# Task 2: Backend — GetUserStatsUseCase [RF-014, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Cria o `GetUserStatsUseCase` que delega ao `UserDAO.countUserStats()`, com cache Redis (TTL igual ao das outras queries de usuários). Inclui testes unitários com `UserDAOMemory`.

## Arquivos

- Create: `apps/backend/src/user/application/use-case/get-user-stats.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/get-user-stats.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: sem Either — use case de leitura sem regras de negócio retorna dado direto (padrão do projeto: vide `FetchUsersUseCase`, `UserMetricsUseCase`)
- test-antipatterns: testes isolados com UserDAOMemory, sem mock manual

## Passos

- [ ] **Step 1: Escrever o teste falhando**

Crie `apps/backend/src/user/application/use-case/get-user-stats.usecase.test.ts`:

```typescript
import { UserDAOMemory } from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import type { RedisAdapter } from "@/shared/infra/database/redis/redis-adapter"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { StatusTypes } from "@/user/domain/value-object/status"
import type { GetUserStatsUseCase } from "./get-user-stats.usecase"

describe("GetUserStatsUseCase", () => {
  let sut: GetUserStatsUseCase
  let userDAO: UserDAOMemory
  let redisAdapter: RedisAdapter

  beforeEach(async () => {
    container.snapshot()
    const userDAOMemory = new UserDAOMemory()
    container.rebind(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
    redisAdapter = container.get(SHARED_TYPES.Redis)
    sut = container.get(USER_TYPES.UseCases.GetUserStats)
    userDAO = container.get(USER_TYPES.DAO.User)
  })

  afterEach(async () => {
    container.restore()
    await redisAdapter.clear()
  })

  test("Deve retornar todos os contadores zerados quando não há usuários", async () => {
    userDAO.clear()
    const result = await sut.execute()
    expect(result).toEqual({
      total: 0,
      members: 0,
      admins: 0,
      active: 0,
      inactive: 0,
    })
  })

  test("Deve contar membros e admins corretamente", async () => {
    userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
    userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
    userDAO.createFakeUser({ role: "ADMIN", status: StatusTypes.ACTIVATED })
    const result = await sut.execute()
    expect(result.total).toBe(3)
    expect(result.members).toBe(2)
    expect(result.admins).toBe(1)
  })

  test("Deve contar ativos e inativos corretamente", async () => {
    userDAO.createFakeUser({ status: StatusTypes.ACTIVATED })
    userDAO.createFakeUser({ status: StatusTypes.ACTIVATED })
    userDAO.createFakeUser({ status: StatusTypes.SUSPENDED })
    const result = await sut.execute()
    expect(result.active).toBe(2)
    expect(result.inactive).toBe(1)
  })

  test("Deve usar cache Redis e não chamar o DAO novamente na segunda chamada", async () => {
    userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
    const first = await sut.execute()
    userDAO.createFakeUser({ role: "ADMIN", status: StatusTypes.ACTIVATED })
    const second = await sut.execute()
    // segunda chamada usa cache — resultado igual ao primeiro
    expect(second).toEqual(first)
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

```bash
pnpm --filter backend test:run -- -t "GetUserStatsUseCase"
```

Esperado: FAIL — `USER_TYPES.UseCases.GetUserStats` não existe ainda.

- [ ] **Step 3: Criar o Use Case**

Crie `apps/backend/src/user/application/use-case/get-user-stats.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import type { UserDAO, UserStatsOutput } from "../persistence/dao/user-dao"

const CACHE_KEY = "user-stats"

@injectable()
export class GetUserStatsUseCase {
  constructor(
    @inject(USER_TYPES.DAO.User)
    private readonly userDAO: UserDAO,
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public async execute(): Promise<UserStatsOutput> {
    const cached = await this.cacheDB.get<UserStatsOutput>(CACHE_KEY)
    this.logger.info(this, { cached })
    if (cached) return cached
    const stats = await this.userDAO.countUserStats()
    void this.cacheDB
      .set(CACHE_KEY, stats, env.TTL)
      .catch((error) =>
        this.logger.warn(this, `Falha ao salvar cache de stats: ${error}`),
      )
    return stats
  }
}
```

- [ ] **Step 4: Adicionar símbolo IoC em user-types.ts**

Abra `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` e adicione `GetUserStats` em `UseCases`:

```typescript
// Dentro do objeto UseCases, após UserMetrics:
GetUserStats: Symbol.for("GetUserStatsUseCase"),
```

O bloco `UseCases` completo deve ficar:

```typescript
UseCases: {
  CreateUser: Symbol.for("CreateUserUseCase"),
  UpdateUser: Symbol.for("UpdateUserUseCase"),
  DeleteUser: Symbol.for("DeleteUserUseCase"),
  FetchUsers: Symbol.for("FetchUsersUseCase"),
  UserProfile: Symbol.for("UserProfileUseCase"),
  ChangePassword: Symbol.for("ChangePasswordUseCase"),
  CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantUseCase"),
  DefinePassword: Symbol.for("DefinePasswordUseCase"),
  ForgotPassword: Symbol.for("ForgotPasswordUseCase"),
  ResetPassword: Symbol.for("ResetPasswordUseCase"),
  ActivateUser: Symbol.for("ActivateUserUseCase"),
  UpdateMyProfile: Symbol.for("UpdateMyProfileUseCase"),
  UpdateUserProfile: Symbol.for("UpdateUserProfileUseCase"),
  SuspendUser: Symbol.for("SuspendUserUseCase"),
  PromoteToAdmin: Symbol.for("PromoteToAdminUseCase"),
  DemoteFromAdmin: Symbol.for("DemoteFromAdminUseCase"),
  UserMetrics: Symbol.for("UserMetricsUseCase"),
  GetUserStats: Symbol.for("GetUserStatsUseCase"),
},
```

- [ ] **Step 5: Registrar no container**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` e adicione o import e o bind de `GetUserStatsUseCase`:

No bloco de imports, adicione:
```typescript
import { GetUserStatsUseCase } from "@/user/application/use-case/get-user-stats.usecase"
```

No `ContainerModule`, adicione após o bind de `UserMetricsUseCase`:
```typescript
bind(USER_TYPES.UseCases.GetUserStats).to(GetUserStatsUseCase)
```

- [ ] **Step 6: Rodar o teste para confirmar sucesso**

```bash
pnpm --filter backend test:run -- -t "GetUserStatsUseCase"
```

Esperado: todos os testes PASS.

- [ ] **Step 7: Verificar tipos e lint**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix
```

Esperado: zero erros.

## Critérios de Sucesso

- `GetUserStatsUseCase.execute()` retorna `UserStatsOutput` com os 5 campos
- Cache Redis é consultado antes do DAO; resultado é armazenado após consulta
- `USER_TYPES.UseCases.GetUserStats` registrado no IoC container
- 4 testes passando: zerado, membros/admins, ativos/inativos, cache
- `tsc:check` e `biome:fix` passam sem erros
