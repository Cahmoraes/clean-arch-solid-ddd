# Task 5: Get notifications + unread count use cases [RF-025, RF-026]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-04

## Visão Geral

Implementar `GetNotificationsUseCase` e `GetUnreadCountUseCase`. Ambos são read-only e retornam `Either<never, Output>` (sempre success). Usados pelos controllers REST GET.

## Arquivos

- Create: `apps/backend/src/notification/application/use-case/get-notifications.usecase.ts`
- Create: `apps/backend/src/notification/application/use-case/get-unread-count.usecase.ts`
- Create: `apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts`
- Create: `apps/backend/src/notification/application/use-case/get-unread-count.usecase.test.ts`

### Conformidade com as Skills Padrão

- code-style: `@injectable()`, `@inject()`, Either pattern, UseCase suffix, input/output interfaces exportadas

## Passos

### Passo 1: Escrever os testes que falham

Arquivo: `apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts`

```ts
import { describe, expect, test, beforeEach } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import { GetNotificationsUseCase } from "./get-notifications.usecase"

function makeNotification(userId = "user-1") {
  return Notification.create({
    userId,
    type: "CHECK_IN_APPROVED",
    title: "Check-in aprovado",
    message: "Aprovado",
  })
}

describe("GetNotificationsUseCase", () => {
  let repository: InMemoryNotificationRepository
  let sut: GetNotificationsUseCase

  beforeEach(() => {
    repository = new InMemoryNotificationRepository()
    sut = new GetNotificationsUseCase(repository)
  })

  test("should return empty list when user has no notifications", async () => {
    const result = await sut.execute({ userId: "user-1", page: 1 })

    expect(result.isSuccess()).toBe(true)
    expect(result.value.items).toHaveLength(0)
    expect(result.value.total).toBe(0)
  })

  test("should return notifications for the user", async () => {
    await repository.save(makeNotification("user-1"))
    await repository.save(makeNotification("user-1"))
    await repository.save(makeNotification("user-2"))

    const result = await sut.execute({ userId: "user-1", page: 1 })

    expect(result.isSuccess()).toBe(true)
    expect(result.value.items).toHaveLength(2)
    expect(result.value.total).toBe(2)
  })

  test("should filter by onlyUnread=true", async () => {
    const n1 = makeNotification("user-1")
    const n2 = makeNotification("user-1")
    n2.markAsRead()
    await repository.save(n1)
    await repository.save(n2)

    const result = await sut.execute({
      userId: "user-1",
      page: 1,
      onlyUnread: true,
    })

    expect(result.isSuccess()).toBe(true)
    expect(result.value.items).toHaveLength(1)
  })
})
```

Arquivo: `apps/backend/src/notification/application/use-case/get-unread-count.usecase.test.ts`

```ts
import { describe, expect, test, beforeEach } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import { GetUnreadCountUseCase } from "./get-unread-count.usecase"

function makeNotification(userId = "user-1") {
  return Notification.create({
    userId,
    type: "CHECK_IN_APPROVED",
    title: "Check-in aprovado",
    message: "Aprovado",
  })
}

describe("GetUnreadCountUseCase", () => {
  let repository: InMemoryNotificationRepository
  let sut: GetUnreadCountUseCase

  beforeEach(() => {
    repository = new InMemoryNotificationRepository()
    sut = new GetUnreadCountUseCase(repository)
  })

  test("should return 0 when no unread notifications", async () => {
    const result = await sut.execute({ userId: "user-1" })
    expect(result.isSuccess()).toBe(true)
    expect(result.value.count).toBe(0)
  })

  test("should return count of unread notifications", async () => {
    await repository.save(makeNotification("user-1"))
    await repository.save(makeNotification("user-1"))
    const read = makeNotification("user-1")
    read.markAsRead()
    await repository.save(read)

    const result = await sut.execute({ userId: "user-1" })
    expect(result.isSuccess()).toBe(true)
    expect(result.value.count).toBe(2)
  })
})
```

### Passo 2: Executar os testes para confirmar falha

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts apps/backend/src/notification/application/use-case/get-unread-count.usecase.test.ts
```

Esperado: FAIL — use cases não existem.

### Passo 3: Implementar `GetNotificationsUseCase`

Arquivo: `apps/backend/src/notification/application/use-case/get-notifications.usecase.ts`

```ts
import { inject, injectable } from "inversify"

import type {
  FindManyNotificationsOutput,
  NotificationRepository,
} from "@/notification/application/repository/notification.repository.js"
import {
  type Either,
  success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface GetNotificationsInput {
  userId: string
  page: number
  onlyUnread?: boolean
}

export type GetNotificationsOutput = FindManyNotificationsOutput

export type GetNotificationsResponse = Either<never, GetNotificationsOutput>

@injectable()
export class GetNotificationsUseCase {
  constructor(
    @inject(NOTIFICATION_TYPES.Repositories.Notification)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  public async execute(
    input: GetNotificationsInput,
  ): Promise<GetNotificationsResponse> {
    const result = await this.notificationRepository.findManyByUserId({
      userId: input.userId,
      page: input.page,
      onlyUnread: input.onlyUnread,
    })
    return success(result)
  }
}
```

### Passo 4: Implementar `GetUnreadCountUseCase`

Arquivo: `apps/backend/src/notification/application/use-case/get-unread-count.usecase.ts`

```ts
import { inject, injectable } from "inversify"

import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import {
  type Either,
  success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface GetUnreadCountInput {
  userId: string
}

export interface GetUnreadCountOutput {
  count: number
}

export type GetUnreadCountResponse = Either<never, GetUnreadCountOutput>

@injectable()
export class GetUnreadCountUseCase {
  constructor(
    @inject(NOTIFICATION_TYPES.Repositories.Notification)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  public async execute(
    input: GetUnreadCountInput,
  ): Promise<GetUnreadCountResponse> {
    const count = await this.notificationRepository.countUnreadByUserId(
      input.userId,
    )
    return success({ count })
  }
}
```

### Passo 5: Executar os testes para confirmar que passam

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts apps/backend/src/notification/application/use-case/get-unread-count.usecase.test.ts
```

Esperado: PASS — todos os testes passam.

> **Nota:** Os testes instanciam os use cases diretamente com o repositório in-memory, sem IoC. O token `NOTIFICATION_TYPES.Repositories.Notification` referenciado no `@inject()` ainda não existe na task 5 — isso é OK pois o decorator `@inject` em Inversify é resolvido em runtime pelo container, não no constructor. Os testes não usam o container, então passam sem o token registrado.

### Passo 6: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 7: Commit

```bash
git add \
  apps/backend/src/notification/application/use-case/get-notifications.usecase.ts \
  apps/backend/src/notification/application/use-case/get-unread-count.usecase.ts \
  apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts \
  apps/backend/src/notification/application/use-case/get-unread-count.usecase.test.ts
git commit -m "feat(notification): add GetNotificationsUseCase and GetUnreadCountUseCase"
```

## Critérios de Sucesso

- `GetNotificationsUseCase.execute()` retorna `Either<never, { items, total }>` [RF-025]
- Suporta filtro `onlyUnread` [RF-026]
- `GetUnreadCountUseCase.execute()` retorna `Either<never, { count }>` [RF-026]
- Todos os testes passam; `biome:fix` + `tsc:check` sem erros
