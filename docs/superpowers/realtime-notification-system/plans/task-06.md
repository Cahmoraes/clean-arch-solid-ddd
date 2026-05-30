# Task 6: Mark as read use cases [RF-016, RF-017, RF-018, RF-019]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-04

## Visão Geral

Implementar `MarkAsReadUseCase` (marcar uma notificação como lida, verificando ownership) e `MarkAllAsReadUseCase` (marcar todas do usuário). `MarkAsReadUseCase` retorna `Either<NotificationNotFoundError, Output>`.

## Arquivos

- Create: `apps/backend/src/notification/application/use-case/mark-as-read.usecase.ts`
- Create: `apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.ts`
- Create: `apps/backend/src/notification/application/use-case/mark-as-read.usecase.test.ts`
- Create: `apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.test.ts`

### Conformidade com as Skills Padrão

- code-style: Either com `failure`/`success`, guard clauses, UseCase suffix

## Passos

### Passo 1: Escrever os testes que falham

Arquivo: `apps/backend/src/notification/application/use-case/mark-as-read.usecase.test.ts`

```ts
import { describe, expect, test, beforeEach } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import { MarkAsReadUseCase } from "./mark-as-read.usecase"

describe("MarkAsReadUseCase", () => {
  let repository: InMemoryNotificationRepository
  let sut: MarkAsReadUseCase

  beforeEach(() => {
    repository = new InMemoryNotificationRepository()
    sut = new MarkAsReadUseCase(repository)
  })

  test("should mark notification as read", async () => {
    const notification = Notification.create({
      id: "notif-1",
      userId: "user-1",
      type: "CHECK_IN_APPROVED",
      title: "Aprovado",
      message: "Aprovado",
    })
    await repository.save(notification)

    const result = await sut.execute({
      notificationId: "notif-1",
      userId: "user-1",
    })

    expect(result.isSuccess()).toBe(true)
    expect(result.value.readAt).toBeInstanceOf(Date)

    const stored = await repository.findById("notif-1")
    expect(stored?.isRead).toBe(true)
  })

  test("should return NotificationNotFoundError when notification does not exist", async () => {
    const result = await sut.execute({
      notificationId: "unknown",
      userId: "user-1",
    })

    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(NotificationNotFoundError)
  })

  test("should return NotificationNotFoundError when notification belongs to another user", async () => {
    const notification = Notification.create({
      id: "notif-1",
      userId: "user-2",
      type: "CHECK_IN_APPROVED",
      title: "Aprovado",
      message: "Aprovado",
    })
    await repository.save(notification)

    const result = await sut.execute({
      notificationId: "notif-1",
      userId: "user-1",
    })

    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(NotificationNotFoundError)
  })
})
```

Arquivo: `apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.test.ts`

```ts
import { describe, expect, test, beforeEach } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import { MarkAllAsReadUseCase } from "./mark-all-as-read.usecase"

function makeNotification(userId = "user-1") {
  return Notification.create({
    userId,
    type: "CHECK_IN_APPROVED",
    title: "Aprovado",
    message: "Aprovado",
  })
}

describe("MarkAllAsReadUseCase", () => {
  let repository: InMemoryNotificationRepository
  let sut: MarkAllAsReadUseCase

  beforeEach(() => {
    repository = new InMemoryNotificationRepository()
    sut = new MarkAllAsReadUseCase(repository)
  })

  test("should mark all unread notifications as read", async () => {
    await repository.save(makeNotification("user-1"))
    await repository.save(makeNotification("user-1"))

    const result = await sut.execute({ userId: "user-1" })

    expect(result.isSuccess()).toBe(true)
    expect(result.value.markedCount).toBe(2)

    const count = await repository.countUnreadByUserId("user-1")
    expect(count).toBe(0)
  })

  test("should return markedCount=0 when no unread notifications", async () => {
    const result = await sut.execute({ userId: "user-1" })

    expect(result.isSuccess()).toBe(true)
    expect(result.value.markedCount).toBe(0)
  })

  test("should not affect other users", async () => {
    await repository.save(makeNotification("user-1"))
    await repository.save(makeNotification("user-2"))

    await sut.execute({ userId: "user-1" })

    const countUser2 = await repository.countUnreadByUserId("user-2")
    expect(countUser2).toBe(1)
  })
})
```

### Passo 2: Executar os testes para confirmar falha

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/application/use-case/mark-as-read.usecase.test.ts apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.test.ts
```

Esperado: FAIL — use cases não existem.

### Passo 3: Implementar `MarkAsReadUseCase`

Arquivo: `apps/backend/src/notification/application/use-case/mark-as-read.usecase.ts`

```ts
import { inject, injectable } from "inversify"

import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error.js"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface MarkAsReadInput {
  notificationId: string
  userId: string
}

export interface MarkAsReadOutput {
  readAt: Date
}

export type MarkAsReadResponse = Either<NotificationNotFoundError, MarkAsReadOutput>

@injectable()
export class MarkAsReadUseCase {
  constructor(
    @inject(NOTIFICATION_TYPES.Repositories.Notification)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  public async execute(input: MarkAsReadInput): Promise<MarkAsReadResponse> {
    const notification = await this.notificationRepository.findById(
      input.notificationId,
    )
    if (!notification) return failure(new NotificationNotFoundError())
    if (notification.userId !== input.userId) {
      return failure(new NotificationNotFoundError())
    }

    notification.markAsRead()
    await this.notificationRepository.save(notification)
    return success({ readAt: notification.readAt! })
  }
}
```

### Passo 4: Implementar `MarkAllAsReadUseCase`

Arquivo: `apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.ts`

```ts
import { inject, injectable } from "inversify"

import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import {
  type Either,
  success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface MarkAllAsReadInput {
  userId: string
}

export interface MarkAllAsReadOutput {
  markedCount: number
}

export type MarkAllAsReadResponse = Either<never, MarkAllAsReadOutput>

@injectable()
export class MarkAllAsReadUseCase {
  constructor(
    @inject(NOTIFICATION_TYPES.Repositories.Notification)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  public async execute(
    input: MarkAllAsReadInput,
  ): Promise<MarkAllAsReadResponse> {
    const { total } = await this.notificationRepository.findManyByUserId({
      userId: input.userId,
      page: 1,
      onlyUnread: true,
    })
    await this.notificationRepository.markAllAsReadByUserId(input.userId)
    return success({ markedCount: total })
  }
}
```

### Passo 5: Executar os testes para confirmar que passam

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/application/use-case/mark-as-read.usecase.test.ts apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.test.ts
```

Esperado: PASS.

### Passo 6: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 7: Commit

```bash
git add \
  apps/backend/src/notification/application/use-case/mark-as-read.usecase.ts \
  apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.ts \
  apps/backend/src/notification/application/use-case/mark-as-read.usecase.test.ts \
  apps/backend/src/notification/application/use-case/mark-all-as-read.usecase.test.ts
git commit -m "feat(notification): add MarkAsReadUseCase and MarkAllAsReadUseCase"
```

## Critérios de Sucesso

- `MarkAsReadUseCase` verifica ownership e retorna `NotificationNotFoundError` para IDs de outros usuários [RF-016, RF-017]
- `MarkAllAsReadUseCase` retorna `markedCount` correto e não afeta outros usuários [RF-018, RF-019]
- Todos os testes passam; `biome:fix` + `tsc:check` sem erros
