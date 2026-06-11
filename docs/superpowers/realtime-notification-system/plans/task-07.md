# Task 7: CreateNotificationOnCheckIn event handler + queue setup [RF-001, RF-020, RF-021, RF-024]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-01, task-04

## Visão Geral

Criar o event handler que escuta `CheckInApprovedEvent` / `CheckInRejectedEvent` (domain events), persiste a `Notification` no repositório e publica na exchange `NOTIFICATION_CREATED` do RabbitMQ. Adicionar `NOTIFICATION_CREATED` aos registros de exchanges, queues e setup do RabbitMQ.

## Arquivos

- Modify: `apps/backend/src/shared/infra/queue/exchanges.ts`
- Modify: `apps/backend/src/shared/infra/queue/queues.ts`
- Modify: `apps/backend/src/shared/infra/queue/queue-setup.ts`
- Create: `apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.ts`
- Create: `apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.test.ts`

### Conformidade com as Skills Padrão

- code-style: `@injectable()`, `subscribe()`/`unsubscribe()` pattern (igual `SendWelcomeEmailNotification`), `boundHandle` binding no constructor

## Passos

### Passo 1: Adicionar `NOTIFICATION_CREATED` em `exchanges.ts`

Arquivo: `apps/backend/src/shared/infra/queue/exchanges.ts`

```ts
export const EXCHANGES = {
  LOG: "log",
  USER_CREATED: "userCreated",
  PASSWORD_CHANGED: "passwordChanged",
  CHECK_IN_CREATED: "checkInCreated",
  STRIPE_WEBHOOK: "stripeWebhook",
  RATE_LIMIT_EXCEEDED: "rateLimitExceeded",
  NOTIFICATION_CREATED: "notificationCreated",
} as const

export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
```

### Passo 2: Adicionar `NOTIFICATION_CREATED` em `queues.ts`

Arquivo: `apps/backend/src/shared/infra/queue/queues.ts`

```ts
export const QUEUES = {
  SEND_WELCOME_EMAIL: "sendWelcomeEmail",
  NOTIFY_PASSWORD_CHANGED: "notifyPasswordChanged",
  LOG: "log",
  CHECK_IN: "checkIn",
  STRIPE_WEBHOOK: "stripeWebhook",
  NOTIFICATION_CREATED: "notificationCreated",
} as const

export type Queues = (typeof QUEUES)[keyof typeof QUEUES]
```

### Passo 3: Registrar exchange + queue + binding em `queue-setup.ts`

Arquivo: `apps/backend/src/shared/infra/queue/queue-setup.ts`

Adicionar nas seções de criação e binding (os três blocos separados):

```ts
// Na seção "Create exchanges" (após a última linha createExchange existente):
await createExchange(channel, EXCHANGES.NOTIFICATION_CREATED)

// Na seção "Create queues" (após a última linha createQueue existente):
await createQueue(channel, QUEUES.NOTIFICATION_CREATED)

// Na seção "Bind queues to exchanges" (após a última linha bindQueueToExchange existente):
await bindQueueToExchange(
  channel,
  QUEUES.NOTIFICATION_CREATED,
  EXCHANGES.NOTIFICATION_CREATED,
)
```

### Passo 4: Escrever o teste que falha

Arquivo: `apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.test.ts`

```ts
import { describe, expect, test, beforeEach, vi, afterEach } from "vitest"
import { CheckInApprovedEvent } from "@/check-in/domain/event/check-in-approved-event"
import { CheckInRejectedEvent } from "@/check-in/domain/event/check-in-rejected-event"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import { CreateNotificationOnCheckInEventHandler } from "./create-notification-on-check-in-event.handler"

const mockQueue = {
  connect: vi.fn(),
  publish: vi.fn().mockResolvedValue(undefined),
  consume: vi.fn(),
}

describe("CreateNotificationOnCheckInEventHandler", () => {
  let repository: InMemoryNotificationRepository
  let handler: CreateNotificationOnCheckInEventHandler

  beforeEach(() => {
    repository = new InMemoryNotificationRepository()
    handler = new CreateNotificationOnCheckInEventHandler(
      repository,
      mockQueue as any,
    )
    handler.subscribe()
  })

  afterEach(() => {
    handler.unsubscribe()
    vi.clearAllMocks()
  })

  test("should create CHECK_IN_APPROVED notification when CheckInApprovedEvent is published", async () => {
    await DomainEventPublisher.instance.publish(
      new CheckInApprovedEvent({
        checkInId: "ci-1",
        userId: "user-1",
        gymId: "gym-1",
      }),
    )

    expect(repository.notifications.size).toBe(1)
    const notification = repository.notifications.toArray()[0]
    expect(notification.userId).toBe("user-1")
    expect(notification.type).toBe("CHECK_IN_APPROVED")
  })

  test("should create CHECK_IN_REJECTED notification when CheckInRejectedEvent is published", async () => {
    await DomainEventPublisher.instance.publish(
      new CheckInRejectedEvent({
        checkInId: "ci-1",
        userId: "user-1",
        gymId: "gym-1",
      }),
    )

    expect(repository.notifications.size).toBe(1)
    const notification = repository.notifications.toArray()[0]
    expect(notification.userId).toBe("user-1")
    expect(notification.type).toBe("CHECK_IN_REJECTED")
  })

  test("should publish to NOTIFICATION_CREATED exchange after saving", async () => {
    await DomainEventPublisher.instance.publish(
      new CheckInApprovedEvent({
        checkInId: "ci-1",
        userId: "user-1",
        gymId: "gym-1",
      }),
    )

    expect(mockQueue.publish).toHaveBeenCalledOnce()
    const [exchange, payload] = mockQueue.publish.mock.calls[0]
    expect(exchange).toBe("notificationCreated")
    expect(payload).toMatchObject({
      notificationId: expect.any(String),
      userId: "user-1",
      type: "CHECK_IN_APPROVED",
    })
  })

  test("should not handle other events", async () => {
    // CHECK_IN_CREATED is not handled
    await DomainEventPublisher.instance.publish({
      eventName: EVENTS.CHECK_IN_CREATED,
      id: "x",
      date: new Date(),
      payload: {},
      toJSON: () => ({}),
    } as any)

    expect(repository.notifications.size).toBe(0)
  })
})
```

### Passo 5: Executar o teste para confirmar falha

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.test.ts
```

Esperado: FAIL — handler não existe.

### Passo 6: Implementar o event handler

Arquivo: `apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.ts`

```ts
import { inject, injectable } from "inversify"

import { CheckInApprovedEvent } from "@/check-in/domain/event/check-in-approved-event.js"
import { CheckInRejectedEvent } from "@/check-in/domain/event/check-in-rejected-event.js"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { Notification } from "@/notification/domain/notification.js"
import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import { EXCHANGES } from "@/shared/infra/queue/exchanges.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

export interface NotificationCreatedPayload {
  notificationId: string
  userId: string
  type: string
  title: string
  message: string
}

@injectable()
export class CreateNotificationOnCheckInEventHandler {
  private readonly boundHandleApproved: (
    event: DomainEvent<unknown>,
  ) => Promise<void>

  private readonly boundHandleRejected: (
    event: DomainEvent<unknown>,
  ) => Promise<void>

  constructor(
    @inject(NOTIFICATION_TYPES.Repositories.Notification)
    private readonly notificationRepository: NotificationRepository,
    @inject(SHARED_TYPES.Queue)
    private readonly queue: Queue,
  ) {
    this.boundHandleApproved = this.handleApproved.bind(this)
    this.boundHandleRejected = this.handleRejected.bind(this)
  }

  public subscribe(): void {
    DomainEventPublisher.instance.subscribe(
      EVENTS.CHECK_IN_APPROVED,
      this.boundHandleApproved,
    )
    DomainEventPublisher.instance.subscribe(
      EVENTS.CHECK_IN_REJECTED,
      this.boundHandleRejected,
    )
  }

  public unsubscribe(): void {
    DomainEventPublisher.instance.unsubscribe(
      EVENTS.CHECK_IN_APPROVED,
      this.boundHandleApproved,
    )
    DomainEventPublisher.instance.unsubscribe(
      EVENTS.CHECK_IN_REJECTED,
      this.boundHandleRejected,
    )
  }

  private async handleApproved(event: DomainEvent<unknown>): Promise<void> {
    if (!(event instanceof CheckInApprovedEvent)) return

    const notification = Notification.create({
      userId: event.payload.userId,
      type: "CHECK_IN_APPROVED",
      title: "Check-in aprovado",
      message: "Seu check-in foi aprovado com sucesso.",
    })

    await this.notificationRepository.save(notification)
    await this.queue.publish<NotificationCreatedPayload>(
      EXCHANGES.NOTIFICATION_CREATED,
      {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      },
    )
  }

  private async handleRejected(event: DomainEvent<unknown>): Promise<void> {
    if (!(event instanceof CheckInRejectedEvent)) return

    const notification = Notification.create({
      userId: event.payload.userId,
      type: "CHECK_IN_REJECTED",
      title: "Check-in rejeitado",
      message: "Seu check-in foi rejeitado.",
    })

    await this.notificationRepository.save(notification)
    await this.queue.publish<NotificationCreatedPayload>(
      EXCHANGES.NOTIFICATION_CREATED,
      {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      },
    )
  }
}
```

### Passo 7: Executar os testes para confirmar que passam

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.test.ts
```

Esperado: PASS.

### Passo 8: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 9: Commit

```bash
git add \
  apps/backend/src/shared/infra/queue/exchanges.ts \
  apps/backend/src/shared/infra/queue/queues.ts \
  apps/backend/src/shared/infra/queue/queue-setup.ts \
  apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.ts \
  apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.test.ts
git commit -m "feat(notification): add CreateNotificationOnCheckInEventHandler and NOTIFICATION_CREATED queue"
```

## Critérios de Sucesso

- `CheckInApprovedEvent` / `CheckInRejectedEvent` criam notificação e publicam no exchange [RF-001, RF-020, RF-021]
- Exchange e queue `NOTIFICATION_CREATED` registrados em exchanges.ts, queues.ts e queue-setup.ts [RF-024]
- Handler não processa outros eventos
- Todos os testes passam; `biome:fix` + `tsc:check` sem erros
