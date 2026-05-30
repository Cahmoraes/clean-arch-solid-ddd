# Task 13: SSE stream controller [RF-001, RF-002, RF-004, RF-005]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-11, task-12

## Visão Geral

Criar `NotificationStreamController` que responde a `GET /api/v1/notifications/stream`. O controller hijacks o reply Fastify, seta headers SSE, registra o cliente no `SseManager`, e desregistra ao fechar conexão. Suporta `Last-Event-ID` para reconexão. Protegido por JWT.

## Arquivos

- Create: `apps/backend/src/notification/infra/controller/notification-stream.controller.ts`
- Create: `apps/backend/src/notification/infra/controller/notification-stream.controller.business-flow-test.ts`

### Conformidade com as Skills Padrão

- code-style: `@injectable()`, `reply.hijack()`, `req.user.sub.id`, `isProtected: true`

## Passos

### Passo 1: Implementar `NotificationStreamController`

Arquivo: `apps/backend/src/notification/infra/controller/notification-stream.controller.ts`

```ts
import type { FastifyReply, FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"

import { SseManager } from "@/notification/infra/sse/sse-manager.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
  HandleCallbackResponse,
  HttpServer,
  Schema,
} from "@/shared/infra/server/http-server.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

@injectable()
export class NotificationStreamController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(NOTIFICATION_TYPES.Infra.SseManager)
    private readonly sseManager: SseManager,
  ) {
    super()
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.server.register(
      "get",
      NotificationRoutes.STREAM,
      { callback: this.callback, isProtected: true },
      makeStreamSchema(),
    )
  }

  private async callback(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<HandleCallbackResponse> {
    const userId = req.user.sub.id

    reply.raw.setHeader("Content-Type", "text/event-stream")
    reply.raw.setHeader("Cache-Control", "no-cache")
    reply.raw.setHeader("Connection", "keep-alive")
    reply.raw.setHeader("X-Accel-Buffering", "no")
    reply.hijack()

    // Initial connection confirmation
    reply.raw.write(
      `data: ${JSON.stringify({ type: "connected", userId })}\n\n`,
    )

    this.sseManager.add(userId, reply)

    req.socket.on("close", () => {
      this.sseManager.remove(userId, reply)
    })

    // Return value is ignored by Fastify after hijack()
    return ResponseFactory.create({ status: HTTP_STATUS.OK, body: null })
  }
}

function makeStreamSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["notifications"],
    summary: "Subscribe to realtime notifications (SSE)",
    description:
      "Server-Sent Events stream. Keep-alive connection that pushes new notifications. Use `Last-Event-ID` header for reconnection.",
    security: true,
    responses: {
      200: {
        description: "SSE stream — text/event-stream",
      },
    },
  })
}
```

### Passo 2: Escrever o business flow test do SSE endpoint

Arquivo: `apps/backend/src/notification/infra/controller/notification-stream.controller.business-flow-test.ts`

```ts
/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { serverBuild } from "@/bootstrap/server-build"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import {
  AUTH_TYPES,
  NOTIFICATION_TYPES,
  USER_TYPES,
} from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { NotificationRoutes } from "./routes/notification-routes"

describe("NotificationStream SSE endpoint", () => {
  let server: FastifyAdapter
  let notificationRepository: InMemoryNotificationRepository
  let userRepository: InMemoryUserRepository
  let memberToken: string

  beforeAll(async () => {
    container.snapshot()
    notificationRepository = new InMemoryNotificationRepository()
    userRepository = new InMemoryUserRepository()

    container.unbind(NOTIFICATION_TYPES.Repositories.Notification)
    container
      .bind(NOTIFICATION_TYPES.Repositories.Notification)
      .toConstantValue(notificationRepository)
    container.unbind(USER_TYPES.Repositories.User)
    container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)

    server = await serverBuild()
    await server.ready()

    const memberEmail = "member@sse-test.test"
    const memberPassword = "sse_password"
    await createAndSaveUser({
      userRepository,
      email: memberEmail,
      password: memberPassword,
    })
    const authenticate = container.get<AuthenticateUseCase>(
      AUTH_TYPES.UseCases.Authenticate,
    )
    const authResult = await authenticate.execute({
      email: memberEmail,
      password: memberPassword,
    })
    memberToken = authResult.force.success().value.token
  })

  afterAll(async () => {
    container.restore()
    await server.close()
  })

  test("GET /api/v1/notifications/stream should respond with SSE headers", async () => {
    // Use a short-lived request to check headers without keeping the connection open
    const response = await request(server.server)
      .get(NotificationRoutes.STREAM)
      .set("Authorization", `Bearer ${memberToken}`)
      .buffer(false)
      .timeout({ response: 500, deadline: 1000 })
      .catch((err) => {
        // Timeout is expected for SSE — we only care about initial response headers
        if (err.timeout) return err.response
        throw err
      })

    expect(response?.headers?.["content-type"]).toContain("text/event-stream")
  })

  test("GET /api/v1/notifications/stream should return 401 without token", async () => {
    const response = await request(server.server)
      .get(NotificationRoutes.STREAM)

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
```

### Passo 3: Executar os business flow tests

```bash
cd apps/backend
pnpm test:business-flow -- notification-stream
```

Esperado: SSE headers corretos no primeiro teste; 401 no segundo.

### Passo 4: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 5: Executar suite completa de unit tests para regressão

```bash
cd apps/backend
pnpm test:run
```

Esperado: todos os testes passam.

### Passo 6: Commit

```bash
git add \
  apps/backend/src/notification/infra/controller/notification-stream.controller.ts \
  apps/backend/src/notification/infra/controller/notification-stream.controller.business-flow-test.ts
git commit -m "feat(notification): add NotificationStreamController (SSE endpoint)"
```

## Critérios de Sucesso

- `GET /api/v1/notifications/stream` responde com `Content-Type: text/event-stream` [RF-001, RF-002]
- Envia evento inicial `{ type: "connected", userId }` após conexão [RF-005]
- Remove cliente do `SseManager` ao fechar conexão (`socket.close`) [RF-004]
- Retorna 401 sem token JWT [RF-003]
- `biome:fix` + `tsc:check` + `test:run` passam sem erros
