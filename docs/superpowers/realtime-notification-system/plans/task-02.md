# Task 2: Notification entity + domain errors [RF-020, RF-021, RF-022, RF-023]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** N/A

## Visão Geral

Criar o bounded context `notification/domain/` com a entidade `Notification` (factory `create()`, restore `restore()`, método `markAsRead()`) e o erro de domínio `NotificationNotFoundError`. Esta é a fundação de todas as outras tasks.

## Arquivos

- Create: `apps/backend/src/notification/domain/notification.ts`
- Create: `apps/backend/src/notification/domain/errors/notification-not-found-error.ts`
- Create: `apps/backend/src/notification/domain/notification.test.ts`

### Conformidade com as Skills Padrão

- code-style: Factory `create()` retorna instância diretamente (sem Either aqui — sem validação externa); `restore()` pula validação; PascalCase classes; `Error` suffix nos erros

## Passos

### Passo 1: Escrever os testes que falham

Arquivo: `apps/backend/src/notification/domain/notification.test.ts`

```ts
import { describe, expect, test } from "vitest"
import { Notification } from "./notification"
import { NotificationNotFoundError } from "./errors/notification-not-found-error"

describe("Notification.create()", () => {
  test("should create a notification with default values", () => {
    const notification = Notification.create({
      userId: "user-1",
      type: "CHECK_IN_APPROVED",
      title: "Check-in aprovado",
      message: "Seu check-in foi aprovado.",
    })

    expect(notification.id).toBeDefined()
    expect(notification.userId).toBe("user-1")
    expect(notification.type).toBe("CHECK_IN_APPROVED")
    expect(notification.title).toBe("Check-in aprovado")
    expect(notification.message).toBe("Seu check-in foi aprovado.")
    expect(notification.readAt).toBeUndefined()
    expect(notification.deletedAt).toBeUndefined()
    expect(notification.isRead).toBe(false)
    expect(notification.isDeleted).toBe(false)
    expect(notification.createdAt).toBeInstanceOf(Date)
  })

  test("should create a notification with a fixed id when provided", () => {
    const notification = Notification.create({
      id: "fixed-id",
      userId: "user-1",
      type: "CHECK_IN_REJECTED",
      title: "Check-in rejeitado",
      message: "Seu check-in foi rejeitado.",
      reason: "Tempo excedido",
    })

    expect(notification.id).toBe("fixed-id")
    expect(notification.reason).toBe("Tempo excedido")
  })

  test("should create a notification with gymName", () => {
    const notification = Notification.create({
      userId: "user-1",
      type: "CHECK_IN_APPROVED",
      title: "Check-in aprovado",
      message: "Seu check-in foi aprovado.",
      gymName: "Academia Força Total",
    })

    expect(notification.gymName).toBe("Academia Força Total")
  })
})

describe("Notification.markAsRead()", () => {
  test("should mark notification as read", () => {
    const notification = Notification.create({
      userId: "user-1",
      type: "CHECK_IN_APPROVED",
      title: "Check-in aprovado",
      message: "Aprovado",
    })

    expect(notification.isRead).toBe(false)
    notification.markAsRead()
    expect(notification.isRead).toBe(true)
    expect(notification.readAt).toBeInstanceOf(Date)
  })

  test("should be idempotent when marking already-read notification", () => {
    const notification = Notification.create({
      userId: "user-1",
      type: "CHECK_IN_APPROVED",
      title: "Check-in aprovado",
      message: "Aprovado",
    })

    notification.markAsRead()
    const firstReadAt = notification.readAt

    notification.markAsRead()
    // readAt should not change after being set
    expect(notification.readAt).toEqual(firstReadAt)
  })
})

describe("Notification.restore()", () => {
  test("should restore a notification with all fields", () => {
    const readAt = new Date("2025-01-01T10:00:00Z")
    const createdAt = new Date("2025-01-01T09:00:00Z")
    const updatedAt = new Date("2025-01-01T10:00:00Z")

    const notification = Notification.restore({
      id: "notif-1",
      userId: "user-1",
      type: "SECURITY_ALERT",
      title: "Alerta de segurança",
      message: "Login de novo dispositivo.",
      readAt,
      deletedAt: undefined,
      createdAt,
      updatedAt,
    })

    expect(notification.id).toBe("notif-1")
    expect(notification.type).toBe("SECURITY_ALERT")
    expect(notification.readAt).toEqual(readAt)
    expect(notification.isRead).toBe(true)
    expect(notification.createdAt).toEqual(createdAt)
  })
})

describe("NotificationNotFoundError", () => {
  test("should be an instance of Error", () => {
    const error = new NotificationNotFoundError()
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("Notification not found")
    expect(error.name).toBe("NotificationNotFoundError")
  })
})
```

### Passo 2: Executar os testes para confirmar falha

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/domain/notification.test.ts
```

Esperado: FAIL — módulos não encontrados.

### Passo 3: Criar `notification-not-found-error.ts`

Arquivo: `apps/backend/src/notification/domain/errors/notification-not-found-error.ts`

```ts
export class NotificationNotFoundError extends Error {
  constructor() {
    super("Notification not found")
    this.name = "NotificationNotFoundError"
  }
}
```

### Passo 4: Criar a entidade `Notification`

Arquivo: `apps/backend/src/notification/domain/notification.ts`

```ts
import { randomUUID } from "node:crypto"

export type NotificationType =
  | "CHECK_IN_APPROVED"
  | "CHECK_IN_REJECTED"
  | "SECURITY_ALERT"
  | "PROMOTION"

export interface NotificationProps {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  gymName?: string
  reason?: string
  readAt?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateNotificationProps {
  id?: string
  userId: string
  type: NotificationType
  title: string
  message: string
  gymName?: string
  reason?: string
}

export interface RestoreNotificationProps {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  gymName?: string
  reason?: string
  readAt?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class Notification {
  private readonly _props: NotificationProps

  private constructor(props: NotificationProps) {
    this._props = props
  }

  public static create(props: CreateNotificationProps): Notification {
    const now = new Date()
    return new Notification({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      type: props.type,
      title: props.title,
      message: props.message,
      gymName: props.gymName,
      reason: props.reason,
      readAt: undefined,
      deletedAt: undefined,
      createdAt: now,
      updatedAt: now,
    })
  }

  public static restore(props: RestoreNotificationProps): Notification {
    return new Notification(props)
  }

  public markAsRead(): void {
    if (this._props.readAt !== undefined) return
    this._props.readAt = new Date()
    this._props.updatedAt = new Date()
  }

  public get id(): string {
    return this._props.id
  }

  public get userId(): string {
    return this._props.userId
  }

  public get type(): NotificationType {
    return this._props.type
  }

  public get title(): string {
    return this._props.title
  }

  public get message(): string {
    return this._props.message
  }

  public get gymName(): string | undefined {
    return this._props.gymName
  }

  public get reason(): string | undefined {
    return this._props.reason
  }

  public get readAt(): Date | undefined {
    return this._props.readAt
  }

  public get deletedAt(): Date | undefined {
    return this._props.deletedAt
  }

  public get createdAt(): Date {
    return this._props.createdAt
  }

  public get updatedAt(): Date {
    return this._props.updatedAt
  }

  public get isRead(): boolean {
    return this._props.readAt !== undefined
  }

  public get isDeleted(): boolean {
    return this._props.deletedAt !== undefined
  }
}
```

### Passo 5: Executar os testes para confirmar que passam

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/notification/domain/notification.test.ts
```

Esperado: PASS — todos os testes passam.

### Passo 6: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 7: Commit

```bash
git add \
  apps/backend/src/notification/domain/notification.ts \
  apps/backend/src/notification/domain/errors/notification-not-found-error.ts \
  apps/backend/src/notification/domain/notification.test.ts
git commit -m "feat(notification): add Notification entity and NotificationNotFoundError"
```

## Critérios de Sucesso

- `Notification.create()` gera ID UUID, timestamps, `readAt=undefined` [RF-022]
- `Notification.restore()` reconstrói sem validação [RF-022]
- `markAsRead()` define `readAt` e `updatedAt`; idempotente [RF-023]
- `NotificationNotFoundError` é instância de `Error` com `.name` correto [RF-023]
- `biome:fix` e `tsc:check` sem erros
