# Task 4: Backend — GetUserStatsController + IoC [RF-014, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Cria o `GetUserStatsController` que expõe `GET /users/stats` (protegido por JWT, somente admin), registra a rota, adiciona o símbolo ao IoC e o controller ao bootstrap. Inclui teste business-flow.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- Create: `apps/backend/src/user/infra/controller/get-user-stats.controller.ts`
- Create: `apps/backend/src/user/infra/controller/get-user-stats.business-flow-test.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`

### Conformidade com as Skills Padrão

- no-workarounds: controller sem lógica de negócio — delega tudo ao use case
- test-antipatterns: business-flow testa o endpoint HTTP real via supertest

## Passos

- [ ] **Step 1: Adicionar rota STATS em user-routes.ts**

Abra `apps/backend/src/user/infra/controller/routes/user-routes.ts` e adicione a constante `STATS`:

```typescript
const PREFIX = "/users"

export const UserRoutes = {
  CREATE: PREFIX,
  FETCH: PREFIX,
  STATS: `${PREFIX}/stats`,
  PROFILE: `${PREFIX}/:userId`,
  ME: `${PREFIX}/me`,
  METRICS: `${PREFIX}/me/metrics`,
  CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
  PASSWORD_REAUTH: `${PREFIX}/me/password/reauth`,
  PASSWORD: `${PREFIX}/me/password`,
  FORGOT_PASSWORD: "/password/forgot",
  RESET_PASSWORD: "/password/reset",
  ACTIVATE_USER: `${PREFIX}/activate`,
  SUSPEND_USER: `${PREFIX}/suspend`,
  PROMOTE_TO_ADMIN: `${PREFIX}/promote-admin`,
  DEMOTE_FROM_ADMIN: `${PREFIX}/demote-admin`,
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
```

- [ ] **Step 2: Escrever o teste business-flow falhando**

Crie `apps/backend/src/user/infra/controller/get-user-stats.business-flow-test.ts`:

```typescript
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { UserDAOMemory } from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { StatusTypes } from "@/user/domain/value-object/status"
import { UserRoutes } from "./routes/user-routes"

describe("GET /users/stats", () => {
  let fastifyServer: FastifyAdapter
  let userDAO: UserDAOMemory
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase
  let adminToken: string
  let memberToken: string

  beforeEach(async () => {
    container.snapshot()
    const userDAOMemory = new UserDAOMemory()
    container.rebind(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
    userDAO = container.get(USER_TYPES.DAO.User)
    userRepository = new InMemoryUserRepository()
    container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(AUTH_TYPES.UseCases.Authenticate)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()

    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "admin@test.com",
      password: "any_password",
      role: "ADMIN",
    })
    const adminResult = await authenticate.execute({
      email: "admin@test.com",
      password: "any_password",
    })
    adminToken = adminResult.force.success().value.token

    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "member@test.com",
      password: "any_password",
    })
    const memberResult = await authenticate.execute({
      email: "member@test.com",
      password: "any_password",
    })
    memberToken = memberResult.force.success().value.token
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("Deve retornar os contadores de usuários para admin autenticado", async () => {
    userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
    userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
    userDAO.createFakeUser({ role: "ADMIN", status: StatusTypes.SUSPENDED })

    const response = await request(fastifyServer.server)
      .get(UserRoutes.STATS)
      .set("Authorization", `Bearer ${adminToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body).toEqual({
      total: 3,
      members: 2,
      admins: 1,
      active: 2,
      inactive: 1,
    })
  })

  test("Deve retornar 401 sem token", async () => {
    const response = await request(fastifyServer.server).get(UserRoutes.STATS)
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  test("Deve retornar 403 para usuário com role MEMBER", async () => {
    const response = await request(fastifyServer.server)
      .get(UserRoutes.STATS)
      .set("Authorization", `Bearer ${memberToken}`)
    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
```

- [ ] **Step 3: Rodar o teste para confirmar falha**

```bash
pnpm --filter backend test:business-flow -- -t "GET /users/stats"
```

Esperado: FAIL — rota não existe.

- [ ] **Step 4: Criar o controller**

Crie `apps/backend/src/user/infra/controller/get-user-stats.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { GetUserStatsUseCase } from "@/user/application/use-case/get-user-stats.usecase"
import { UserRoutes } from "./routes/user-routes"

@injectable()
export class GetUserStatsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.GetUserStats)
    private readonly getUserStats: GetUserStatsUseCase,
  ) {
    super()
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "get",
      UserRoutes.STATS,
      { callback: this.callback, isProtected: true, onlyAdmin: true },
      makeGetUserStatsSwaggerSchema(),
    )
  }

  private async callback(_req: FastifyRequest) {
    const stats = await this.getUserStats.execute()
    return ResponseFactory.OK({ body: stats })
  }
}

const statsResponseSchema = z.object({
  total: z.number().meta({ description: "Total de usuários" }),
  members: z.number().meta({ description: "Total de membros" }),
  admins: z.number().meta({ description: "Total de administradores" }),
  active: z.number().meta({ description: "Total de usuários ativos" }),
  inactive: z.number().meta({ description: "Total de usuários inativos" }),
})

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

function makeGetUserStatsSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Get user statistics",
    description:
      "Returns user counts by category. Requires authentication and admin role.",
    security: true,
    responses: {
      200: {
        description: "User statistics retrieved successfully",
        schema: statsResponseSchema,
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden", schema: errorResponseSchema },
    },
  })
}
```

- [ ] **Step 5: Adicionar símbolo do controller em user-types.ts**

Abra `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` e adicione `GetUserStats` em `Controllers`:

```typescript
Controllers: {
  // ... existing entries ...
  DemoteFromAdmin: Symbol.for("DemoteFromAdminController"),
  GetUserStats: Symbol.for("GetUserStatsController"),
},
```

- [ ] **Step 6: Registrar no container (user-module.ts)**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` e adicione:

Import:
```typescript
import { GetUserStatsController } from "@/user/infra/controller/get-user-stats.controller"
```

Bind (junto aos outros controllers):
```typescript
bind(USER_TYPES.Controllers.GetUserStats).to(GetUserStatsController)
```

- [ ] **Step 7: Registrar no bootstrap (setup-user-module.ts)**

Abra `apps/backend/src/bootstrap/setup-user-module.ts` e adicione ao array `controllers`:

```typescript
resolve(USER_TYPES.Controllers.GetUserStats),
```

- [ ] **Step 8: Rodar o teste business-flow para confirmar sucesso**

```bash
pnpm --filter backend test:business-flow -- -t "GET /users/stats"
```

Esperado: 3 testes PASS.

- [ ] **Step 9: Verificar tipos, lint e build**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix && pnpm --filter backend build
```

Esperado: zero erros.

## Critérios de Sucesso

- `GET /users/stats` retorna `{ total, members, admins, active, inactive }` com status 200
- Retorna 401 sem token, 403 para MEMBER
- `UserRoutes.STATS` definido em user-routes.ts
- `USER_TYPES.Controllers.GetUserStats` e `USER_TYPES.UseCases.GetUserStats` registrados no IoC
- Controller resolvido no bootstrap
- 3 testes business-flow passando
- `tsc:check`, `biome:fix` e `build` passam
