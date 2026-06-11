# Task 2: Backend — Stats de check-ins (countByStatus + use case + controllers + IoC) [RF-001, RF-002, RF-003, RF-004, RF-005]

**Status:** DONE
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** N/A

## Visão Geral

Cria a infraestrutura completa de stats de check-ins do zero:
1. Método `countByStatus(userId?: string)` adicionado à interface `CheckInRepository` e implementado no Prisma e in-memory
2. `GetCheckInStatsUseCase` — use case leve (sem cache) que chama `countByStatus`
3. `GetCheckInStatsController` — `GET /check-ins/stats` (admin-only)
4. `GetMyCheckInStatsController` — `GET /check-ins/me/stats` (usuário autenticado, passa `userId`)
5. Símbolos IoC e bindings no container

Resposta de ambos os endpoints: `{ total: number, pending: number, validated: number, rejected: number }`

## Arquivos

- Modify: `apps/backend/src/check-in/application/repository/check-in-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts`
- Create: `apps/backend/src/check-in/application/use-case/get-check-in-stats.usecase.ts`
- Create: `apps/backend/src/check-in/infra/controller/get-check-in-stats.controller.ts`
- Create: `apps/backend/src/check-in/infra/controller/get-my-check-in-stats.controller.ts`
- Modify: `apps/backend/src/check-in/infra/controller/routes/check-in-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/checkin-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/check-in/check-in-module.ts`
- Test: `apps/backend/src/check-in/application/use-case/get-check-in-stats.usecase.test.ts`
- Test: `apps/backend/src/check-in/infra/controller/get-check-in-stats.business-flow-test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: implementar `countByStatus` com 4 queries paralelas (`Promise.all`) em vez de lógica de pós-processamento
- code-style: seguir padrão `GetUserStatsController` para estrutura de controller de stats

## Passos

### Passo 1: Escrever o teste unitário que falha (use case de stats)

Criar `apps/backend/src/check-in/application/use-case/get-check-in-stats.usecase.test.ts`:

```typescript
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { container } from "@/shared/infra/ioc/container"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import type { GetCheckInStatsUseCase } from "./get-check-in-stats.usecase"

describe("GetCheckInStatsUseCase", () => {
  let sut: GetCheckInStatsUseCase
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(() => {
    container.snapshot()
    const repos = setupInMemoryRepositories()
    checkInRepository = repos.checkInRepository
    sut = container.get<GetCheckInStatsUseCase>(CHECKIN_TYPES.UseCases.GetCheckInStats)
  })

  afterEach(() => {
    container.restore()
  })

  test("Deve retornar zeros quando não há check-ins", async () => {
    const stats = await sut.execute({})
    expect(stats).toEqual({ total: 0, pending: 0, validated: 0, rejected: 0 })
  })

  test("Deve contar check-ins por status corretamente", async () => {
    await createAndSaveCheckIn({ checkInRepository, id: "ci-p1", userId: "u1", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-p2", userId: "u2", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    const checkIn3 = await createAndSaveCheckIn({ checkInRepository, id: "ci-v1", userId: "u3", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    // Forçar status validated
    checkIn3.status // usar API pública do domínio
    checkInRepository.checkIns.forEach((c) => {
      if (c.id === "ci-v1") c.validate()
    })
    const checkIn4 = await createAndSaveCheckIn({ checkInRepository, id: "ci-r1", userId: "u4", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    checkInRepository.checkIns.forEach((c) => {
      if (c.id === "ci-r1") c.reject()
    })

    const stats = await sut.execute({})

    expect(stats.total).toBe(4)
    expect(stats.pending).toBe(2)
    expect(stats.validated).toBe(1)
    expect(stats.rejected).toBe(1)
  })

  test("Deve filtrar por userId quando informado", async () => {
    await createAndSaveCheckIn({ checkInRepository, id: "ci-u1a", userId: "user-A", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-u1b", userId: "user-A", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-u2", userId: "user-B", gymId: "g1", userLatitude: 0, userLongitude: 0 })

    const stats = await sut.execute({ userId: "user-A" })

    expect(stats.total).toBe(2)
  })
})
```

- [ ] **Step 1: Rodar o teste para verificar que falha**

```bash
cd apps/backend && pnpm test:run -- get-check-in-stats.usecase.test 2>&1 | tail -15
```

Resultado esperado: `FAIL` com `Cannot find module` ou `CHECKIN_TYPES.UseCases.GetCheckInStats` não definido.

### Passo 2: Adicionar `CheckInStats` e `countByStatus` à interface do repositório

**`apps/backend/src/check-in/application/repository/check-in-repository.ts`** — adicionar antes de `CheckInRepository`:

```typescript
export interface CheckInStats {
  total: number
  pending: number
  validated: number
  rejected: number
}

export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<SaveResponse>
  checkOfById(id: string): Promise<CheckIn | null>
  onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
  findMany(input: FindManyInput): Promise<FindManyOutput>
  countByStatus(userId?: string): Promise<CheckInStats>
  withTransaction<TX extends object>(object: TX): CheckInRepository
}
```

### Passo 3: Implementar `countByStatus` no repositório Prisma

**`apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts`** — adicionar o import do tipo e o método:

```typescript
import type {
  CheckInRepository,
  CheckInStats,
  FindManyInput,
  FindManyOutput,
  SaveResponse,
  SortOrder,
} from "@/check-in/application/repository/check-in-repository"

// Dentro da classe PrismaCheckInRepository:
public async countByStatus(userId?: string): Promise<CheckInStats> {
  const baseWhere: Prisma.CheckInWhereInput = userId ? { user_id: userId } : {}
  const [total, pending, validated, rejected] = await Promise.all([
    this.prismaClient.checkIn.count({ where: baseWhere }),
    this.prismaClient.checkIn.count({
      where: { ...baseWhere, validated_at: null, rejected_at: null },
    }),
    this.prismaClient.checkIn.count({
      where: { ...baseWhere, validated_at: { not: null }, rejected_at: null },
    }),
    this.prismaClient.checkIn.count({
      where: { ...baseWhere, rejected_at: { not: null } },
    }),
  ])
  return { total, pending, validated, rejected }
}
```

### Passo 4: Implementar `countByStatus` no repositório in-memory

**`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts`** — adicionar import e método:

```typescript
import type {
  CheckInRepository,
  CheckInStats,
  FindManyInput,
  FindManyOutput,
  SaveResponse,
  SortOrder,
} from "@/check-in/application/repository/check-in-repository"

// Dentro da classe InMemoryCheckInRepository:
public async countByStatus(userId?: string): Promise<CheckInStats> {
  const all = this.checkIns.toArray()
  const filtered = userId ? all.filter((c) => c.userId === userId) : all
  const pending = filtered.filter((c) => c.status === "pending").length
  const validated = filtered.filter((c) => c.status === "validated").length
  const rejected = filtered.filter((c) => c.status === "rejected").length
  return { total: filtered.length, pending, validated, rejected }
}
```

### Passo 5: Adicionar símbolos IoC para o novo use case e controllers

**`apps/backend/src/shared/infra/ioc/module/service-identifier/checkin-types.ts`** — adicionar ao objeto existente:

```typescript
export const CHECKIN_TYPES = {
  Repositories: {
    CheckIn: Symbol.for("CheckInRepository"),
  },
  PG: {
    CheckIn: Symbol.for("PgCheckInRepository"),
  },
  UseCases: {
    CreateCheckIn: Symbol.for("CreateCheckInUseCase"),
    ValidateCheckIn: Symbol.for("ValidateCheckInUseCase"),
    RejectCheckIn: Symbol.for("RejectCheckInUseCase"),
    FetchCheckIns: Symbol.for("FetchCheckInsUseCase"),
    CheckIn: Symbol.for("CheckInUseCase"),
    CheckInHistory: Symbol.for("CheckInHistoryUseCase"),
    GetCheckInStats: Symbol.for("GetCheckInStatsUseCase"),     // ← NOVO
  },
  Controllers: {
    CheckIn: Symbol.for("CheckInController"),
    ValidateCheckIn: Symbol.for("ValidateCheckInController"),
    RejectCheckIn: Symbol.for("RejectCheckInController"),
    ListCheckIns: Symbol.for("ListCheckInsController"),
    MyCheckIns: Symbol.for("MyCheckInsController"),
    Metrics: Symbol.for("CheckInMetricsController"),
    GetCheckInStats: Symbol.for("GetCheckInStatsController"),  // ← NOVO
    GetMyCheckInStats: Symbol.for("GetMyCheckInStatsController"), // ← NOVO
  },
} as const
```

### Passo 6: Adicionar rotas de stats ao objeto de rotas

**`apps/backend/src/check-in/infra/controller/routes/check-in-routes.ts`**:

```typescript
export const CheckInRoutes = {
  CREATE: "/check-ins",
  LIST: "/check-ins",
  HISTORY: "/check-ins/me",
  METRICS: "/check-ins/metrics/:userId",
  VALIDATE: "/check-ins/validate",
  REJECT: "/check-ins/reject",
  STATS: "/check-ins/stats",        // ← NOVO (admin)
  MY_STATS: "/check-ins/me/stats",  // ← NOVO (usuário)
} as const
```

### Passo 7: Criar `GetCheckInStatsUseCase`

Criar `apps/backend/src/check-in/application/use-case/get-check-in-stats.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import type { CheckInStats } from "@/check-in/application/repository/check-in-repository"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import type { CheckInRepository } from "../repository/check-in-repository"

export interface GetCheckInStatsUseCaseInput {
  userId?: string
}

@injectable()
export class GetCheckInStatsUseCase {
  constructor(
    @inject(CHECKIN_TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(input: GetCheckInStatsUseCaseInput): Promise<CheckInStats> {
    return this.checkInRepository.countByStatus(input.userId)
  }
}
```

### Passo 8: Criar `GetCheckInStatsController` (admin)

Criar `apps/backend/src/check-in/infra/controller/get-check-in-stats.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { GetCheckInStatsUseCase } from "@/check-in/application/use-case/get-check-in-stats.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { CheckInRoutes } from "./routes/check-in-routes"

@injectable()
export class GetCheckInStatsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(CHECKIN_TYPES.UseCases.GetCheckInStats)
    private readonly getCheckInStats: GetCheckInStatsUseCase,
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
      CheckInRoutes.STATS,
      { callback: this.callback, isProtected: true, onlyAdmin: true },
      makeGetCheckInStatsSwaggerSchema(),
    )
  }

  private async callback(_req: FastifyRequest) {
    const stats = await this.getCheckInStats.execute({})
    return ResponseFactory.OK({ body: stats })
  }
}

function makeGetCheckInStatsSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["check-ins"],
    summary: "Get check-in statistics",
    description: "Returns check-in counts by status. Requires ADMIN role.",
    security: true,
    responses: {
      200: {
        description: "Check-in stats retrieved successfully",
        schema: z.object({
          total: z.number().meta({ description: "Total de check-ins" }),
          pending: z.number().meta({ description: "Check-ins pendentes" }),
          validated: z.number().meta({ description: "Check-ins aprovados" }),
          rejected: z.number().meta({ description: "Check-ins rejeitados" }),
        }),
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
    },
  })
}
```

### Passo 9: Criar `GetMyCheckInStatsController` (usuário)

Criar `apps/backend/src/check-in/infra/controller/get-my-check-in-stats.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { GetCheckInStatsUseCase } from "@/check-in/application/use-case/get-check-in-stats.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { CheckInRoutes } from "./routes/check-in-routes"

@injectable()
export class GetMyCheckInStatsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(CHECKIN_TYPES.UseCases.GetCheckInStats)
    private readonly getCheckInStats: GetCheckInStatsUseCase,
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
      CheckInRoutes.MY_STATS,
      { callback: this.callback, isProtected: true },
      makeGetMyCheckInStatsSwaggerSchema(),
    )
  }

  private async callback(req: FastifyRequest) {
    const stats = await this.getCheckInStats.execute({ userId: req.user.sub.id })
    return ResponseFactory.OK({ body: stats })
  }
}

function makeGetMyCheckInStatsSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["check-ins"],
    summary: "Get my check-in statistics",
    description: "Returns the authenticated user's check-in counts by status.",
    security: true,
    responses: {
      200: {
        description: "Check-in stats retrieved successfully",
        schema: z.object({
          total: z.number().meta({ description: "Total de meus check-ins" }),
          pending: z.number().meta({ description: "Check-ins pendentes" }),
          validated: z.number().meta({ description: "Check-ins aprovados" }),
          rejected: z.number().meta({ description: "Check-ins rejeitados" }),
        }),
      },
      401: { description: "Unauthorized" },
    },
  })
}
```

### Passo 10: Registrar no container IoC

**`apps/backend/src/shared/infra/ioc/module/check-in/check-in-module.ts`** — adicionar imports e bindings:

```typescript
import { GetCheckInStatsUseCase } from "@/check-in/application/use-case/get-check-in-stats.usecase"
import { GetCheckInStatsController } from "@/check-in/infra/controller/get-check-in-stats.controller"
import { GetMyCheckInStatsController } from "@/check-in/infra/controller/get-my-check-in-stats.controller"

// Dentro de checkInModule, adicionar:
bind(CHECKIN_TYPES.UseCases.GetCheckInStats).to(GetCheckInStatsUseCase)
bind(CHECKIN_TYPES.Controllers.GetCheckInStats).to(GetCheckInStatsController)
bind(CHECKIN_TYPES.Controllers.GetMyCheckInStats).to(GetMyCheckInStatsController)
```

O arquivo completo após modificação:

```typescript
import { ContainerModule } from "inversify"
import { CheckInUseCase } from "@/check-in/application/use-case/check-in.usecase"
import { CheckInHistoryUseCase } from "@/check-in/application/use-case/check-in-history.usecase"
import { FetchCheckInsUseCase } from "@/check-in/application/use-case/fetch-check-ins.usecase"
import { GetCheckInStatsUseCase } from "@/check-in/application/use-case/get-check-in-stats.usecase"
import { RejectCheckInUseCase } from "@/check-in/application/use-case/reject-check-in.usecase"
import { ValidateCheckInUseCase } from "@/check-in/application/use-case/validate-check-in.usecase"
import { CheckInController } from "@/check-in/infra/controller/check-in.controller"
import { GetCheckInStatsController } from "@/check-in/infra/controller/get-check-in-stats.controller"
import { GetMyCheckInStatsController } from "@/check-in/infra/controller/get-my-check-in-stats.controller"
import { ListCheckInsController } from "@/check-in/infra/controller/list-check-ins.controller"
import { MetricsController } from "@/check-in/infra/controller/metrics.controller"
import { MyCheckInsController } from "@/check-in/infra/controller/my-check-ins.controller"
import { RejectCheckInController } from "@/check-in/infra/controller/reject-check-in.controller"
import { ValidateCheckInController } from "@/check-in/infra/controller/validate-check-in.controller"
import { CHECKIN_TYPES } from "../../types"
import { CheckInRepositoryProvider } from "./check-in-repository-provider"

export const checkInModule = new ContainerModule(({ bind }) => {
  bind(CHECKIN_TYPES.Repositories.CheckIn)
    .toDynamicValue(CheckInRepositoryProvider.provide)
    .inSingletonScope()
  bind(CHECKIN_TYPES.Controllers.ValidateCheckIn).to(ValidateCheckInController)
  bind(CHECKIN_TYPES.Controllers.RejectCheckIn).to(RejectCheckInController)
  bind(CHECKIN_TYPES.Controllers.CheckIn).to(CheckInController)
  bind(CHECKIN_TYPES.Controllers.ListCheckIns).to(ListCheckInsController)
  bind(CHECKIN_TYPES.Controllers.MyCheckIns).to(MyCheckInsController)
  bind(CHECKIN_TYPES.Controllers.Metrics).to(MetricsController)
  bind(CHECKIN_TYPES.Controllers.GetCheckInStats).to(GetCheckInStatsController)
  bind(CHECKIN_TYPES.Controllers.GetMyCheckInStats).to(GetMyCheckInStatsController)
  bind(CHECKIN_TYPES.UseCases.CheckIn).to(CheckInUseCase)
  bind(CHECKIN_TYPES.UseCases.CheckInHistory).to(CheckInHistoryUseCase)
  bind(CHECKIN_TYPES.UseCases.FetchCheckIns).to(FetchCheckInsUseCase)
  bind(CHECKIN_TYPES.UseCases.GetCheckInStats).to(GetCheckInStatsUseCase)
  bind(CHECKIN_TYPES.UseCases.ValidateCheckIn).to(ValidateCheckInUseCase)
  bind(CHECKIN_TYPES.UseCases.RejectCheckIn).to(RejectCheckInUseCase)
})
```

- [ ] **Step 10: Verificar que os novos controllers precisam ser registrados no bootstrap**

```bash
grep -r "GetUserStatsController\|ListCheckInsController" apps/backend/src/bootstrap/ | head -10
```

Se o bootstrap iterar sobre todos os controllers do container, nada a fazer. Se registrar explicitamente, adicionar os novos controllers.

### Passo 11: Criar testes de business-flow para os endpoints de stats

Criar `apps/backend/src/check-in/infra/controller/get-check-in-stats.business-flow-test.ts`:

```typescript
import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, CHECKIN_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"
import { CheckInRoutes } from "./routes/check-in-routes"

describe("Stats de Check-Ins", () => {
  let fastifyServer: FastifyAdapter
  let checkInRepository: InMemoryCheckInRepository
  let gymRepository: InMemoryGymRepository
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase

  beforeEach(async () => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    container.unbind(GYM_TYPES.Repositories.Gym)
    container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
    container.unbind(CHECKIN_TYPES.Repositories.CheckIn)
    container.bind(CHECKIN_TYPES.Repositories.CheckIn).toConstantValue(checkInRepository)
    container.unbind(USER_TYPES.Repositories.User)
    container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(AUTH_TYPES.UseCases.Authenticate)
    fastifyServer = await serverBuild()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("GET /check-ins/stats — retorna zeros para admin sem check-ins", async () => {
    await createAndSaveUser({ userRepository, email: "admin@test.com", password: "pass123", role: RoleValues.ADMIN })
    const authResult = await authenticate.execute({ email: "admin@test.com", password: "pass123" })
    const { token } = authResult.forceSuccess().value

    const response = await request(fastifyServer.server)
      .get(CheckInRoutes.STATS)
      .auth(token, { type: "bearer" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ total: 0, pending: 0, validated: 0, rejected: 0 })
  })

  test("GET /check-ins/stats — retorna contagem correta de check-ins", async () => {
    const admin = await createAndSaveUser({ userRepository, id: "adm-1", email: "admin@test.com", password: "pass123", role: RoleValues.ADMIN })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-1", userId: admin.id, gymId: "g1", userLatitude: 0, userLongitude: 0 })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-2", userId: admin.id, gymId: "g1", userLatitude: 0, userLongitude: 0 })
    const authResult = await authenticate.execute({ email: "admin@test.com", password: "pass123" })
    const { token } = authResult.forceSuccess().value

    const response = await request(fastifyServer.server)
      .get(CheckInRoutes.STATS)
      .auth(token, { type: "bearer" })

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(2)
    expect(response.body.pending).toBe(2)
  })

  test("GET /check-ins/stats — retorna 403 para membro não-admin", async () => {
    await createAndSaveUser({ userRepository, email: "member@test.com", password: "pass123", role: RoleValues.MEMBER })
    const authResult = await authenticate.execute({ email: "member@test.com", password: "pass123" })
    const { token } = authResult.forceSuccess().value

    const response = await request(fastifyServer.server)
      .get(CheckInRoutes.STATS)
      .auth(token, { type: "bearer" })

    expect(response.status).toBe(403)
  })

  test("GET /check-ins/me/stats — retorna stats do usuário autenticado", async () => {
    const member = await createAndSaveUser({ userRepository, id: "mem-1", email: "member@test.com", password: "pass123", role: RoleValues.MEMBER })
    await createAndSaveUser({ userRepository, id: "other-1", email: "other@test.com", password: "pass123", role: RoleValues.MEMBER })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-mem-1", userId: member.id, gymId: "g1", userLatitude: 0, userLongitude: 0 })
    await createAndSaveCheckIn({ checkInRepository, id: "ci-other-1", userId: "other-1", gymId: "g1", userLatitude: 0, userLongitude: 0 })
    const authResult = await authenticate.execute({ email: "member@test.com", password: "pass123" })
    const { token } = authResult.forceSuccess().value

    const response = await request(fastifyServer.server)
      .get(CheckInRoutes.MY_STATS)
      .auth(token, { type: "bearer" })

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(1)
  })
})
```

- [ ] **Step 11: Rodar os testes unitários e business-flow**

```bash
cd apps/backend && pnpm test:run -- get-check-in-stats 2>&1 | tail -20
cd apps/backend && pnpm test:business-flow -- get-check-in-stats 2>&1 | tail -20
```

Resultado esperado: todos os testes passam.

### Passo 12: Verificar compilação e rodar suite completa

- [ ] **Step 12a: Type check**

```bash
cd apps/backend && pnpm tsc:check 2>&1 | tail -10
```

Resultado esperado: zero erros.

- [ ] **Step 12b: Suite de testes**

```bash
cd apps/backend && pnpm test:run 2>&1 | tail -20
```

Resultado esperado: todos passam.

- [ ] **Step 12c: Lint**

```bash
cd apps/backend && pnpm biome:fix 2>&1 | tail -10
```

Resultado esperado: zero issues.

- [ ] **Step 12d: Commit**

```bash
git add \
  apps/backend/src/check-in/application/repository/check-in-repository.ts \
  apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts \
  apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts \
  apps/backend/src/check-in/application/use-case/get-check-in-stats.usecase.ts \
  apps/backend/src/check-in/application/use-case/get-check-in-stats.usecase.test.ts \
  apps/backend/src/check-in/infra/controller/get-check-in-stats.controller.ts \
  apps/backend/src/check-in/infra/controller/get-my-check-in-stats.controller.ts \
  apps/backend/src/check-in/infra/controller/get-check-in-stats.business-flow-test.ts \
  apps/backend/src/check-in/infra/controller/routes/check-in-routes.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/checkin-types.ts \
  apps/backend/src/shared/infra/ioc/module/check-in/check-in-module.ts
git commit -m "feat(check-in): add stats endpoints GET /check-ins/stats and /check-ins/me/stats"
```

## Critérios de Sucesso

- `GET /check-ins/stats` retorna HTTP 200 com `{ total, pending, validated, rejected }` para admin
- `GET /check-ins/stats` retorna HTTP 403 para usuário não-admin
- `GET /check-ins/me/stats` retorna HTTP 200 com stats filtrados pelo `userId` do token JWT
- `pnpm test:run` e `pnpm tsc:check` passam com zero erros
- RF-001 (stats disponíveis na API): ✅
- RF-002 (contagem total): ✅
- RF-003 (contagem por status): ✅
- RF-004 (admin vê todos): ✅
- RF-005 (usuário vê seus próprios): ✅
