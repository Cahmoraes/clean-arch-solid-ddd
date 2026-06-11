# Task 12: REST notification controllers [RF-003, RF-025, RF-026]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-11

## Visão Geral

Criar os 4 controllers REST para notificações:
- `GET /api/v1/notifications` — lista notificações paginadas com filtro `?unreadOnly=true`
- `GET /api/v1/notifications/unread-count` — retorna contagem de não-lidas
- `PATCH /api/v1/notifications/:id/read` — marca uma notificação como lida
- `PATCH /api/v1/notifications/read-all` — marca todas como lidas

Todos protegidos por JWT (`isProtected: true`). Inclui business flow tests.

## Arquivos

- Create: `apps/backend/src/notification/infra/controller/routes/notification-routes.ts`
- Create: `apps/backend/src/notification/infra/controller/get-notifications.controller.ts`
- Create: `apps/backend/src/notification/infra/controller/get-unread-count.controller.ts`
- Create: `apps/backend/src/notification/infra/controller/mark-as-read.controller.ts`
- Create: `apps/backend/src/notification/infra/controller/mark-all-as-read.controller.ts`
- Create: `apps/backend/src/notification/infra/controller/get-notifications.controller.business-flow-test.ts`

### Conformidade com as Skills Padrão

- code-style: `extends BaseController`, `@injectable()`, `@inject()`, `ResponseFactory.create()`, OpenApiSchemaBuilder, `req.user.sub.id`

## Passos

### Passo 1: Criar `notification-routes.ts`

Arquivo: `apps/backend/src/notification/infra/controller/routes/notification-routes.ts`

```ts
export const NotificationRoutes = {
  LIST: "/api/v1/notifications",
  UNREAD_COUNT: "/api/v1/notifications/unread-count",
  MARK_AS_READ: "/api/v1/notifications/:id/read",
  MARK_ALL_AS_READ: "/api/v1/notifications/read-all",
  STREAM: "/api/v1/notifications/stream",
} as const

export type NotificationRoutesType =
  (typeof NotificationRoutes)[keyof typeof NotificationRoutes]
```

### Passo 2: Criar `GetNotificationsController`

Arquivo: `apps/backend/src/notification/infra/controller/get-notifications.controller.ts`

```ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"

import type { GetNotificationsUseCase } from "@/notification/application/use-case/get-notifications.usecase.js"
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

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  unreadOnly: z.coerce.boolean().optional().default(false),
})

@injectable()
export class GetNotificationsController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(NOTIFICATION_TYPES.UseCases.GetNotifications)
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
  ) {
    super()
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.server.register(
      "get",
      NotificationRoutes.LIST,
      { callback: this.callback, isProtected: true },
      makeListSchema(),
    )
  }

  private async callback(
    req: FastifyRequest,
  ): Promise<HandleCallbackResponse> {
    const parsed = this.parseRequest(listQuerySchema, req.query)
    if (parsed.isFailure()) return this.createResponseError(parsed)

    const userId = req.user.sub.id
    const result = await this.getNotificationsUseCase.execute({
      userId,
      page: parsed.value.page,
      onlyUnread: parsed.value.unreadOnly,
    })

    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: {
        notifications: result.value.items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          gymName: n.gymName ?? null,
          reason: n.reason ?? null,
          readAt: n.readAt ?? null,
          createdAt: n.createdAt,
        })),
        total: result.value.total,
      },
    })
  }
}

function makeListSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["notifications"],
    summary: "List user notifications",
    security: true,
    querystring: listQuerySchema,
    responses: {
      200: {
        description: "Notifications list",
        schema: z.object({
          notifications: z.array(
            z.object({
              id: z.string(),
              type: z.string(),
              title: z.string(),
              message: z.string(),
              gymName: z.string().nullable(),
              reason: z.string().nullable(),
              readAt: z.iso.datetime().nullable(),
              createdAt: z.iso.datetime(),
            }),
          ),
          total: z.number(),
        }),
      },
    },
  })
}
```

### Passo 3: Criar `GetUnreadCountController`

Arquivo: `apps/backend/src/notification/infra/controller/get-unread-count.controller.ts`

```ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"

import type { GetUnreadCountUseCase } from "@/notification/application/use-case/get-unread-count.usecase.js"
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
export class GetUnreadCountController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(NOTIFICATION_TYPES.UseCases.GetUnreadCount)
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
  ) {
    super()
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.server.register(
      "get",
      NotificationRoutes.UNREAD_COUNT,
      { callback: this.callback, isProtected: true },
      makeSchema(),
    )
  }

  private async callback(
    req: FastifyRequest,
  ): Promise<HandleCallbackResponse> {
    const userId = req.user.sub.id
    const result = await this.getUnreadCountUseCase.execute({ userId })

    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: { count: result.value.count },
    })
  }
}

function makeSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["notifications"],
    summary: "Get unread notifications count",
    security: true,
    responses: {
      200: {
        description: "Unread count",
        schema: z.object({ count: z.number() }),
      },
    },
  })
}
```

### Passo 4: Criar `MarkAsReadController`

Arquivo: `apps/backend/src/notification/infra/controller/mark-as-read.controller.ts`

```ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { ZodError, z } from "zod"

import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error.js"
import type { MarkAsReadUseCase } from "@/notification/application/use-case/mark-as-read.usecase.js"
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

const paramsSchema = z.object({
  id: z.string().uuid(),
})

@injectable()
export class MarkAsReadController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(NOTIFICATION_TYPES.UseCases.MarkAsRead)
    private readonly markAsReadUseCase: MarkAsReadUseCase,
  ) {
    super()
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.server.register(
      "patch",
      NotificationRoutes.MARK_AS_READ,
      { callback: this.callback, isProtected: true },
      makeSchema(),
    )
  }

  protected override mapResponseError(
    error: Error | Error[],
  ): HandleCallbackResponse | undefined {
    if (Array.isArray(error) || error instanceof ZodError) return undefined
    if (error instanceof NotificationNotFoundError) {
      return ResponseFactory.create({
        status: HTTP_STATUS.NOT_FOUND,
        message: error.message,
      })
    }
    return undefined
  }

  private async callback(
    req: FastifyRequest,
  ): Promise<HandleCallbackResponse> {
    const parsed = this.parseRequest(paramsSchema, req.params)
    if (parsed.isFailure()) return this.createResponseError(parsed)

    const userId = req.user.sub.id
    const result = await this.markAsReadUseCase.execute({
      notificationId: parsed.value.id,
      userId,
    })
    if (result.isFailure()) return this.createResponseError(result)

    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: { readAt: result.value.readAt },
    })
  }
}

function makeSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["notifications"],
    summary: "Mark a notification as read",
    security: true,
    params: paramsSchema,
    responses: {
      200: {
        description: "Notification marked as read",
        schema: z.object({ readAt: z.iso.datetime() }),
      },
      404: {
        description: "Notification not found",
        schema: z.object({ message: z.string() }),
      },
    },
  })
}
```

### Passo 5: Criar `MarkAllAsReadController`

Arquivo: `apps/backend/src/notification/infra/controller/mark-all-as-read.controller.ts`

```ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"

import type { MarkAllAsReadUseCase } from "@/notification/application/use-case/mark-all-as-read.usecase.js"
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
export class MarkAllAsReadController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(NOTIFICATION_TYPES.UseCases.MarkAllAsRead)
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase,
  ) {
    super()
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.server.register(
      "patch",
      NotificationRoutes.MARK_ALL_AS_READ,
      { callback: this.callback, isProtected: true },
      makeSchema(),
    )
  }

  private async callback(
    req: FastifyRequest,
  ): Promise<HandleCallbackResponse> {
    const userId = req.user.sub.id
    const result = await this.markAllAsReadUseCase.execute({ userId })

    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: { markedCount: result.value.markedCount },
    })
  }
}

function makeSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["notifications"],
    summary: "Mark all notifications as read",
    security: true,
    responses: {
      200: {
        description: "All notifications marked as read",
        schema: z.object({ markedCount: z.number() }),
      },
    },
  })
}
```

### Passo 6: Escrever o business flow test

Arquivo: `apps/backend/src/notification/infra/controller/get-notifications.controller.business-flow-test.ts`

```ts
/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { serverBuild } from "@/bootstrap/server-build"
import { Notification } from "@/notification/domain/notification"
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

describe("Notification REST endpoints", () => {
  let server: FastifyAdapter
  let notificationRepository: InMemoryNotificationRepository
  let userRepository: InMemoryUserRepository
  let memberToken: string
  let memberId: string

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

    const memberEmail = "member@notification-test.test"
    const memberPassword = "member_password"
    const user = await createAndSaveUser({
      userRepository,
      email: memberEmail,
      password: memberPassword,
    })
    memberId = user.id!

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

  test("GET /api/v1/notifications should return empty list", async () => {
    const response = await request(server.server)
      .get(NotificationRoutes.LIST)
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body.notifications).toEqual([])
    expect(response.body.total).toBe(0)
  })

  test("GET /api/v1/notifications should return user notifications", async () => {
    const n = Notification.create({
      userId: memberId,
      type: "CHECK_IN_APPROVED",
      title: "Aprovado",
      message: "Seu check-in foi aprovado.",
    })
    await notificationRepository.save(n)

    const response = await request(server.server)
      .get(NotificationRoutes.LIST)
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body.notifications).toHaveLength(1)
    expect(response.body.total).toBe(1)
  })

  test("GET /api/v1/notifications/unread-count should return count", async () => {
    const response = await request(server.server)
      .get(NotificationRoutes.UNREAD_COUNT)
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(typeof response.body.count).toBe("number")
  })

  test("PATCH /api/v1/notifications/:id/read should mark notification as read", async () => {
    const n = Notification.create({
      id: "notif-mark-read",
      userId: memberId,
      type: "CHECK_IN_APPROVED",
      title: "Aprovado",
      message: "Aprovado",
    })
    await notificationRepository.save(n)

    const response = await request(server.server)
      .patch(NotificationRoutes.MARK_AS_READ.replace(":id", "notif-mark-read"))
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(new Date(response.body.readAt).getTime()).not.toBeNaN()
  })

  test("PATCH /api/v1/notifications/read-all should return markedCount", async () => {
    const response = await request(server.server)
      .patch(NotificationRoutes.MARK_ALL_AS_READ)
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(typeof response.body.markedCount).toBe("number")
  })

  test("PATCH /api/v1/notifications/:id/read returns 404 for unknown id", async () => {
    const response = await request(server.server)
      .patch(
        NotificationRoutes.MARK_AS_READ.replace(
          ":id",
          "00000000-0000-0000-0000-000000000000",
        ),
      )
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })
})
```

### Passo 7: Executar os testes de business flow

```bash
cd apps/backend
pnpm test:business-flow -- --reporter=verbose
```

Esperado: todos os testes passam.

### Passo 8: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 9: Commit

```bash
git add \
  apps/backend/src/notification/infra/controller/routes/notification-routes.ts \
  apps/backend/src/notification/infra/controller/get-notifications.controller.ts \
  apps/backend/src/notification/infra/controller/get-unread-count.controller.ts \
  apps/backend/src/notification/infra/controller/mark-as-read.controller.ts \
  apps/backend/src/notification/infra/controller/mark-all-as-read.controller.ts \
  apps/backend/src/notification/infra/controller/get-notifications.controller.business-flow-test.ts
git commit -m "feat(notification): add REST controllers for notifications"
```

## Critérios de Sucesso

- `GET /api/v1/notifications` retorna lista paginada com filtro `unreadOnly` [RF-003, RF-025]
- `GET /api/v1/notifications/unread-count` retorna `{ count }` [RF-026]
- `PATCH /api/v1/notifications/:id/read` retorna 404 para ID desconhecido ou de outro user [RF-016]
- `PATCH /api/v1/notifications/read-all` retorna `{ markedCount }` [RF-018]
- Business flow tests passam; `biome:fix` + `tsc:check` sem erros
