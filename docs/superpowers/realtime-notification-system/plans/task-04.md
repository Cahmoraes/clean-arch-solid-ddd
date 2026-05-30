# Task 4: InMemory notification repository [RF-024, RF-025, RF-026]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-03

## Visão Geral

Implementar `InMemoryNotificationRepository` para uso em testes unitários e environment de desenvolvimento. Usa `ExtendedSet` (mesmo padrão de outros repositórios in-memory do projeto). Esta implementação será usada em todos os use case tests das tasks 5, 6 e 7.

## Arquivos

- Create: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts`
- Create: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.test.ts`

### Conformidade com as Skills Padrão

- code-style: `@injectable()`, `ExtendedSet`, nomes kebab-case, `.js` em imports internos

## Passos

### Passo 1: Escrever os testes que falham

Arquivo: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.test.ts`

```ts
import { describe, expect, test, beforeEach } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "./in-memory-notification.repository"

function makeNotification(overrides?: Partial<Parameters<typeof Notification.create>[0]>) {
  return Notification.create({
    userId: "user-1",
    type: "CHECK_IN_APPROVED",
    title: "Check-in aprovado",
    message: "Aprovado",
    ...overrides,
  })
}

describe("InMemoryNotificationRepository", () => {
  let sut: InMemoryNotificationRepository

  beforeEach(() => {
    sut = new InMemoryNotificationRepository()
  })

  test("save() should persist a notification", async () => {
    const notification = makeNotification()
    const result = await sut.save(notification)
    expect(result.id).toBe(notification.id)
    expect(sut.notifications.size).toBe(1)
  })

  test("save() should update an existing notification", async () => {
    const notification = makeNotification({ id: "notif-1" })
    await sut.save(notification)
    notification.markAsRead()
    await sut.save(notification)

    expect(sut.notifications.size).toBe(1)
    const stored = await sut.findById("notif-1")
    expect(stored?.isRead).toBe(true)
  })

  test("findById() should return null for unknown id", async () => {
    const result = await sut.findById("unknown")
    expect(result).toBeNull()
  })

  test("findById() should return the notification", async () => {
    const notification = makeNotification({ id: "notif-1" })
    await sut.save(notification)
    const result = await sut.findById("notif-1")
    expect(result?.id).toBe("notif-1")
  })

  test("findManyByUserId() should return only the user's notifications", async () => {
    await sut.save(makeNotification({ userId: "user-1" }))
    await sut.save(makeNotification({ userId: "user-1" }))
    await sut.save(makeNotification({ userId: "user-2" }))

    const result = await sut.findManyByUserId({ userId: "user-1", page: 1 })
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  test("findManyByUserId() with onlyUnread=true should filter read notifications", async () => {
    const n1 = makeNotification({ userId: "user-1" })
    const n2 = makeNotification({ userId: "user-1" })
    n2.markAsRead()
    await sut.save(n1)
    await sut.save(n2)

    const result = await sut.findManyByUserId({
      userId: "user-1",
      page: 1,
      onlyUnread: true,
    })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  test("countUnreadByUserId() should return count of unread notifications", async () => {
    await sut.save(makeNotification({ userId: "user-1" }))
    const n2 = makeNotification({ userId: "user-1" })
    n2.markAsRead()
    await sut.save(n2)

    const count = await sut.countUnreadByUserId("user-1")
    expect(count).toBe(1)
  })

  test("markAllAsReadByUserId() should mark all unread notifications as read", async () => {
    await sut.save(makeNotification({ userId: "user-1" }))
    await sut.save(makeNotification({ userId: "user-1" }))

    await sut.markAllAsReadByUserId("user-1")

    const count = await sut.countUnreadByUserId("user-1")
    expect(count).toBe(0)
  })

  test("markAllAsReadByUserId() should not affect other users", async () => {
    await sut.save(makeNotification({ userId: "user-1" }))
    await sut.save(makeNotification({ userId: "user-2" }))

    await sut.markAllAsReadByUserId("user-1")

    const countUser2 = await sut.countUnreadByUserId("user-2")
    expect(countUser2).toBe(1)
  })
})
```

### Passo 2: Executar testes para confirmar falha

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.test.ts
```

Esperado: FAIL — módulo não existe.

### Passo 3: Implementar o repositório

Arquivo: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts`

```ts
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"

import type {
  FindManyNotificationsInput,
  FindManyNotificationsOutput,
  NotificationRepository,
  SaveNotificationResponse,
} from "@/notification/application/repository/notification.repository.js"
import type { Notification } from "@/notification/domain/notification.js"
import { env } from "@/shared/infra/env/index.js"

@injectable()
export class InMemoryNotificationRepository implements NotificationRepository {
  public notifications = new ExtendedSet<Notification>()

  public async save(
    notification: Notification,
  ): Promise<SaveNotificationResponse> {
    const existing = this.notifications.find((n) => n.id === notification.id)
    if (existing) {
      this.notifications.delete(existing)
    }
    this.notifications.add(notification)
    return { id: notification.id }
  }

  public async findById(id: string): Promise<Notification | null> {
    return this.notifications.find((n) => n.id === id) ?? null
  }

  public async findManyByUserId(
    input: FindManyNotificationsInput,
  ): Promise<FindManyNotificationsOutput> {
    let filtered = this.notifications
      .toArray()
      .filter((n) => n.userId === input.userId && !n.isDeleted)

    if (input.onlyUnread) {
      filtered = filtered.filter((n) => !n.isRead)
    }

    const total = filtered.length
    const start = (input.page - 1) * env.ITEMS_PER_PAGE
    const items = filtered.slice(start, start + env.ITEMS_PER_PAGE)
    return { items, total }
  }

  public async countUnreadByUserId(userId: string): Promise<number> {
    return this.notifications
      .toArray()
      .filter((n) => n.userId === userId && !n.isRead && !n.isDeleted).length
  }

  public async markAllAsReadByUserId(userId: string): Promise<void> {
    const unread = this.notifications
      .toArray()
      .filter((n) => n.userId === userId && !n.isRead && !n.isDeleted)
    for (const notification of unread) {
      notification.markAsRead()
    }
  }
}
```

### Passo 4: Executar testes para confirmar que passam

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.test.ts
```

Esperado: PASS — todos os testes passam.

### Passo 5: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 6: Commit

```bash
git add \
  apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts \
  apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.test.ts
git commit -m "feat(notification): add InMemoryNotificationRepository"
```

## Critérios de Sucesso

- `save()` persiste e atualiza notificações por ID [RF-024]
- `findManyByUserId()` respeita paginação e filtro `onlyUnread` [RF-025, RF-026]
- `countUnreadByUserId()` retorna apenas não-lidas não-deletadas [RF-026]
- `markAllAsReadByUserId()` afeta somente o usuário solicitado [RF-024]
- Todos os testes passam; `biome:fix` + `tsc:check` sem erros
