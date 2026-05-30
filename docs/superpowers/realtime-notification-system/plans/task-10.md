# Task 10: SseManager + RedisNotificationPublisher + RedisNotificationSubscriber [RF-001, RF-002, RF-004]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-07

## Visão Geral

Implementar três componentes de infraestrutura para entrega realtime:

1. **`SseManager`** — singleton que mantém `Map<userId, Set<FastifyReply>>`, envia mensagens SSE para todas as tabs abertas de um usuário e limpa conexões mortas.
2. **`RedisNotificationPublisher`** — cria sua própria conexão ioredis (separada do `RedisAdapter`) e expõe `publish(channel, message)`. Usada pelo `NotificationQueueWorker` na task-11.
3. **`RedisNotificationSubscriber`** — cria conexão ioredis de subscriber e faz `PSUBSCRIBE notifications:*`, chamando `SseManager.send()` quando mensagem chega. Iniciada no bootstrap.

Também criar o `NotificationQueueWorker` que consome a queue `NOTIFICATION_CREATED` e delega para `RedisNotificationPublisher`.

## Arquivos

- Create: `apps/backend/src/notification/infra/sse/sse-manager.ts`
- Create: `apps/backend/src/notification/infra/redis/redis-notification-publisher.ts`
- Create: `apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts`
- Create: `apps/backend/src/notification/infra/worker/notification-queue-worker.ts`
- Create: `apps/backend/src/notification/infra/sse/sse-manager.test.ts`

### Conformidade com as Skills Padrão

- code-style: `@injectable()`, ioredis direto (sem `CacheDB`), `inSingletonScope()` para `SseManager` e `RedisNotificationSubscriber`

## Passos

### Passo 1: Escrever o teste de `SseManager` que falha

Arquivo: `apps/backend/src/notification/infra/sse/sse-manager.test.ts`

```ts
import { describe, expect, test, beforeEach, vi } from "vitest"
import { SseManager } from "./sse-manager"

function makeReply() {
  return {
    raw: {
      write: vi.fn(),
    },
  }
}

describe("SseManager", () => {
  let sut: SseManager

  beforeEach(() => {
    sut = new SseManager()
  })

  test("add() should register a client", () => {
    const reply = makeReply()
    sut.add("user-1", reply as any)
    expect(sut.clientCount("user-1")).toBe(1)
  })

  test("remove() should unregister a client", () => {
    const reply = makeReply()
    sut.add("user-1", reply as any)
    sut.remove("user-1", reply as any)
    expect(sut.clientCount("user-1")).toBe(0)
  })

  test("send() should write SSE message to all clients of a user", () => {
    const reply1 = makeReply()
    const reply2 = makeReply()
    sut.add("user-1", reply1 as any)
    sut.add("user-1", reply2 as any)

    sut.send("user-1", { type: "notification", id: "n-1" })

    const expected = `data: ${JSON.stringify({ type: "notification", id: "n-1" })}\n\n`
    expect(reply1.raw.write).toHaveBeenCalledWith(expected)
    expect(reply2.raw.write).toHaveBeenCalledWith(expected)
  })

  test("send() should remove dead clients that throw on write()", () => {
    const alive = makeReply()
    const dead = {
      raw: { write: vi.fn().mockImplementation(() => { throw new Error("socket closed") }) },
    }
    sut.add("user-1", alive as any)
    sut.add("user-1", dead as any)

    sut.send("user-1", { type: "ping" })

    expect(sut.clientCount("user-1")).toBe(1)
    expect(alive.raw.write).toHaveBeenCalledOnce()
  })

  test("send() should be a no-op when user has no clients", () => {
    expect(() => sut.send("user-without-clients", { type: "ping" })).not.toThrow()
  })

  test("clientCount() should return 0 for unknown user", () => {
    expect(sut.clientCount("unknown")).toBe(0)
  })
})
```

### Passo 2: Executar o teste para confirmar falha

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/infra/sse/sse-manager.test.ts
```

Esperado: FAIL — módulo não existe.

### Passo 3: Implementar `SseManager`

Arquivo: `apps/backend/src/notification/infra/sse/sse-manager.ts`

```ts
import { injectable } from "inversify"
import type { FastifyReply } from "fastify"

@injectable()
export class SseManager {
  private readonly clients = new Map<string, Set<FastifyReply>>()

  public add(userId: string, reply: FastifyReply): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(reply)
  }

  public remove(userId: string, reply: FastifyReply): void {
    const userClients = this.clients.get(userId)
    if (!userClients) return
    userClients.delete(reply)
    if (userClients.size === 0) {
      this.clients.delete(userId)
    }
  }

  public send(userId: string, data: unknown): void {
    const userClients = this.clients.get(userId)
    if (!userClients) return

    const message = `data: ${JSON.stringify(data)}\n\n`
    const deadClients: FastifyReply[] = []

    for (const reply of userClients) {
      try {
        reply.raw.write(message)
      } catch {
        deadClients.push(reply)
      }
    }

    for (const dead of deadClients) {
      this.remove(userId, dead)
    }
  }

  public clientCount(userId: string): number {
    return this.clients.get(userId)?.size ?? 0
  }
}
```

### Passo 4: Executar testes de `SseManager` para confirmar que passam

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/infra/sse/sse-manager.test.ts
```

Esperado: PASS.

### Passo 5: Implementar `RedisNotificationPublisher`

Arquivo: `apps/backend/src/notification/infra/redis/redis-notification-publisher.ts`

```ts
import IORedis from "ioredis"
import { injectable } from "inversify"

import { env } from "@/shared/infra/env/index.js"

@injectable()
export class RedisNotificationPublisher {
  private readonly client: IORedis

  constructor() {
    this.client = new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      enableOfflineQueue: false,
      lazyConnect: true,
    })
  }

  public async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message)
  }

  public async disconnect(): Promise<void> {
    await this.client.quit()
  }
}
```

### Passo 6: Implementar `RedisNotificationSubscriber`

Arquivo: `apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts`

```ts
import IORedis from "ioredis"
import { inject, injectable } from "inversify"

import { env } from "@/shared/infra/env/index.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"
import type { SseManager } from "../sse/sse-manager.js"

export interface NotificationCreatedPayload {
  notificationId: string
  userId: string
  type: string
  title: string
  message: string
}

@injectable()
export class RedisNotificationSubscriber {
  private readonly client: IORedis

  constructor(
    @inject(NOTIFICATION_TYPES.Infra.SseManager)
    private readonly sseManager: SseManager,
  ) {
    this.client = new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      enableOfflineQueue: false,
      lazyConnect: true,
    })
  }

  public async subscribe(): Promise<void> {
    await this.client.connect()
    await this.client.psubscribe("notifications:*")

    this.client.on(
      "pmessage",
      (_pattern: string, channel: string, message: string) => {
        const userId = channel.replace("notifications:", "")
        try {
          const payload = JSON.parse(message) as NotificationCreatedPayload
          this.sseManager.send(userId, { type: "notification", payload })
        } catch (error) {
          console.error(
            "[RedisNotificationSubscriber] Failed to parse message:",
            error,
          )
        }
      },
    )
  }

  public async disconnect(): Promise<void> {
    await this.client.punsubscribe("notifications:*")
    await this.client.quit()
  }
}
```

### Passo 7: Implementar `NotificationQueueWorker`

Arquivo: `apps/backend/src/notification/infra/worker/notification-queue-worker.ts`

```ts
import { inject, injectable } from "inversify"

import type { NotificationCreatedPayload } from "@/notification/infra/redis/redis-notification-subscriber.js"
import type { Controller } from "@/shared/infra/controller/controller.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import { QUEUES } from "@/shared/infra/queue/queues.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { RedisNotificationPublisher } from "../redis/redis-notification-publisher.js"

@injectable()
export class NotificationQueueWorker implements Controller {
  constructor(
    @inject(SHARED_TYPES.Queue)
    private readonly queue: Queue,
    @inject(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher)
    private readonly redisPublisher: RedisNotificationPublisher,
  ) {}

  public async init(): Promise<void> {
    this.queue.consume(
      QUEUES.NOTIFICATION_CREATED,
      async (payload: NotificationCreatedPayload): Promise<void> => {
        const channel = `notifications:${payload.userId}`
        await this.redisPublisher.publish(channel, JSON.stringify(payload))
      },
    )
  }
}
```

### Passo 8: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 9: Commit

```bash
git add \
  apps/backend/src/notification/infra/sse/sse-manager.ts \
  apps/backend/src/notification/infra/sse/sse-manager.test.ts \
  apps/backend/src/notification/infra/redis/redis-notification-publisher.ts \
  apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts \
  apps/backend/src/notification/infra/worker/notification-queue-worker.ts
git commit -m "feat(notification): add SseManager, RedisNotificationPublisher, RedisNotificationSubscriber, NotificationQueueWorker"
```

## Critérios de Sucesso

- `SseManager` suporta múltiplas tabs por usuário e remove clientes mortos [RF-004]
- `RedisNotificationPublisher.publish()` publica no canal `notifications:{userId}` [RF-001]
- `RedisNotificationSubscriber` faz PSUBSCRIBE e entrega via `SseManager.send()` [RF-002]
- `NotificationQueueWorker` consome `NOTIFICATION_CREATED` e delega ao publisher [RF-001]
- Todos os testes de `SseManager` passam; `biome:fix` + `tsc:check` sem erros
