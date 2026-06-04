# Task 8: Backend Infra — Controllers + rotas analytics [FR-001]

**Status:** PENDING
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-04, task-05, task-06

## Visão Geral

Cria os três controllers de analytics que registram rotas `GET /admin/analytics/{checkins,retention,growth}` com `onlyAdmin: true`, validam o query param `period` via Zod e delegam aos respectivos use cases.

## Arquivos

- Create: `apps/backend/src/analytics/infra/http/controller/fetch-check-in-analytics.controller.ts`
- Create: `apps/backend/src/analytics/infra/http/controller/fetch-retention-analytics.controller.ts`
- Create: `apps/backend/src/analytics/infra/http/controller/fetch-growth-analytics.controller.ts`

### Conformidade com as Skills Padrão

- no-workarounds: query params em GET são acessados via `req.query`, não `req.body`. Usar `this.parseRequest(schema, req.query)`.

## Passos

- **Step 1: Criar FetchCheckInAnalyticsController**

```typescript
// apps/backend/src/analytics/infra/http/controller/fetch-check-in-analytics.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { ANALYTICS_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { HttpServer } from "@/shared/infra/server/http-server"
import type { FetchCheckInAnalyticsUseCase } from "@/analytics/application/use-case/fetch-check-in-analytics.usecase"

const querySchema = z.object({
  period: z.string().default("30d"),
})

@injectable()
export class FetchCheckInAnalyticsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics)
    private readonly useCase: FetchCheckInAnalyticsUseCase,
  ) {
    super()
    this.bindMethod()
  }

  private bindMethod(): void {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "FetchCheckInAnalyticsController" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "get",
      "/admin/analytics/checkins",
      {
        callback: this.callback,
        isProtected: true,
        onlyAdmin: true,
      },
    )
  }

  public async callback(req: FastifyRequest) {
    const parseResult = this.parseRequest(querySchema, req.query)
    if (parseResult.isFailure()) {
      return this.createResponseError(parseResult)
    }
    const result = await this.useCase.execute({ period: parseResult.forceSuccess().value.period })
    if (result.isFailure()) {
      return this.createResponseError(result)
    }
    return ResponseFactory.OK({ body: result.forceSuccess().value })
  }
}
```

- **Step 2: Criar FetchRetentionAnalyticsController**

```typescript
// apps/backend/src/analytics/infra/http/controller/fetch-retention-analytics.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { ANALYTICS_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { HttpServer } from "@/shared/infra/server/http-server"
import type { FetchRetentionAnalyticsUseCase } from "@/analytics/application/use-case/fetch-retention-analytics.usecase"

const querySchema = z.object({
  period: z.string().default("30d"),
})

@injectable()
export class FetchRetentionAnalyticsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics)
    private readonly useCase: FetchRetentionAnalyticsUseCase,
  ) {
    super()
    this.bindMethod()
  }

  private bindMethod(): void {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "FetchRetentionAnalyticsController" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "get",
      "/admin/analytics/retention",
      {
        callback: this.callback,
        isProtected: true,
        onlyAdmin: true,
      },
    )
  }

  public async callback(req: FastifyRequest) {
    const parseResult = this.parseRequest(querySchema, req.query)
    if (parseResult.isFailure()) {
      return this.createResponseError(parseResult)
    }
    const result = await this.useCase.execute({ period: parseResult.forceSuccess().value.period })
    if (result.isFailure()) {
      return this.createResponseError(result)
    }
    return ResponseFactory.OK({ body: result.forceSuccess().value })
  }
}
```

- **Step 3: Criar FetchGrowthAnalyticsController**

```typescript
// apps/backend/src/analytics/infra/http/controller/fetch-growth-analytics.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { ANALYTICS_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { HttpServer } from "@/shared/infra/server/http-server"
import type { FetchGrowthAnalyticsUseCase } from "@/analytics/application/use-case/fetch-growth-analytics.usecase"

const querySchema = z.object({
  period: z.string().default("30d"),
})

@injectable()
export class FetchGrowthAnalyticsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics)
    private readonly useCase: FetchGrowthAnalyticsUseCase,
  ) {
    super()
    this.bindMethod()
  }

  private bindMethod(): void {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "FetchGrowthAnalyticsController" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "get",
      "/admin/analytics/growth",
      {
        callback: this.callback,
        isProtected: true,
        onlyAdmin: true,
      },
    )
  }

  public async callback(req: FastifyRequest) {
    const parseResult = this.parseRequest(querySchema, req.query)
    if (parseResult.isFailure()) {
      return this.createResponseError(parseResult)
    }
    const result = await this.useCase.execute({ period: parseResult.forceSuccess().value.period })
    if (result.isFailure()) {
      return this.createResponseError(result)
    }
    return ResponseFactory.OK({ body: result.forceSuccess().value })
  }
}
```

- **Step 4: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

- **Step 5: Rodar todos os testes unitários**

```bash
pnpm --filter backend test:run
```

Expected: todos os testes passam.

## Critérios de Sucesso

- Três rotas registradas: `GET /admin/analytics/checkins`, `/retention`, `/growth`
- Todas com `onlyAdmin: true` e `isProtected: true`
- Query param `period` com default `"30d"` validado via Zod
- `pnpm --filter backend tsc:check` passa
