---
created_at: "2026-05-30T15:09:31-03:00"
updated_at: "2026-05-30T15:11:20-03:00"
---

# Design: Sistema de Notificação em Tempo Real

## 1. Visão Geral

Sistema de notificações em tempo real com ícone de sino no header do frontend. Entrega via SSE (Server-Sent Events), persistência em PostgreSQL, fan-out via Redis Pub/Sub e durabilidade via RabbitMQ.

**Tipos de notificação no escopo:**
- `CHECK_IN_APPROVED` — check-in validado por um admin
- `CHECK_IN_REJECTED` — check-in rejeitado por um admin
- `SECURITY_ALERT` — alerta de segurança (ex: login suspeito, conta bloqueada)
- `PROMOTION` — promoções (schema suportado, producer fora de escopo desta implementação)

**Fora do escopo:**
- Producer de notificações de promoção (admin UI ou evento automático)
- Push notifications mobile / web push (service workers)
- Email notifications (já existe em bounded context separado)

---

## 2. Arquitetura

### 2.1 Fluxo End-to-End

```
CheckIn.validate() / CheckIn.reject()
    → DomainEventPublisher.publish(CheckInApprovedEvent | CheckInRejectedEvent)
         ↓  (subscriber wired no bootstrap)
CreateNotificationOnCheckInEventHandler   [application layer]
    1. NotificationRepository.create(notification)   → persiste no PostgreSQL
    2. Queue.publish(EXCHANGES.NOTIFICATION_CREATED, { userId, notificationId })
         ↓  (QueueController consumer — mesmo processo)
NotificationConsumer.handle(msg)
    1. redis.publish(`notifications:${userId}`, thinPayload)
    2. ch.ack()
         ↓  (PSUBSCRIBE ativo desde o startup — 1 por instância Fastify)
SseManager.fanout(userId, event)
    → Map<userId, Set<WritableStream>>.get(userId)?.forEach(stream => stream.write())
         ↓
GET /api/v1/notifications/stream   [SSE endpoint, isProtected]
    → useNotificationStream() no Next.js
         ↓
queryClient.invalidateQueries(['notifications'])
queryClient.invalidateQueries(['notifications', 'unread-count'])
```

### 2.2 Decisões Arquiteturais

| Dimensão | Decisão | Justificativa |
|---|---|---|
| Transport | SSE via `reply.hijack()` nativo | Zero dependência adicional; unidirecional; HTTP-nativo |
| SSE client | `@microsoft/fetch-event-source` | Suporta `Authorization: Bearer` — mantém padrão de auth do projeto |
| Fan-out horizontal | `PSUBSCRIBE notifications:*` (1 por instância) | Evita explosão de conexões Redis; suporta N instâncias |
| Worker | In-process no `QueueController` existente | Reutiliza infraestrutura; sem novo processo/app |
| Autenticação SSE | Bearer token (mesmo padrão do projeto) | `EventSource` nativo não suporta headers; `fetch-event-source` resolve |
| Persistência | PostgreSQL — fonte da verdade | Permite catch-up via `Last-Event-ID` na reconexão |
| Mark as read | Híbrido: click individual + "marcar todas" | Melhor UX: feedback imediato + limpeza rápida |
| UI pattern | Dropdown flutuante (10 itens + "Ver histórico") | Não abandona contexto; feedback imediato |

---

## 3. Backend

### 3.1 Bounded Context: `notification/`

```
src/notification/
├── domain/
│   ├── notification.ts
│   └── errors/
│       └── notification-not-found-error.ts
├── application/
│   ├── event-handler/
│   │   └── create-notification-on-check-in-event.handler.ts
│   ├── use-case/
│   │   ├── get-notifications.usecase.ts
│   │   ├── get-unread-count.usecase.ts
│   │   ├── mark-as-read.usecase.ts
│   │   └── mark-all-as-read.usecase.ts
│   └── repository/
│       └── notification.repository.ts
└── infra/
    ├── controller/
    │   ├── get-notifications.controller.ts
    │   ├── get-unread-count.controller.ts
    │   ├── mark-as-read.controller.ts
    │   ├── mark-all-as-read.controller.ts
    │   └── notification-stream.controller.ts
    ├── repository/
    │   ├── prisma-notification.repository.ts
    │   └── in-memory-notification.repository.ts
    └── sse/
        ├── sse-manager.ts
        └── redis-notification-subscriber.ts
```

### 3.2 Entidade `Notification`

```typescript
type NotificationType = 'CHECK_IN_APPROVED' | 'CHECK_IN_REJECTED' | 'SECURITY_ALERT' | 'PROMOTION'
type NotificationSeverity = 'info' | 'warning' | 'critical'

interface NotificationProps {
  userId: string
  type: NotificationType
  title: string
  body: string
  severity: NotificationSeverity
  metadata?: Record<string, unknown>
  readAt?: Date | null
  deletedAt?: Date | null
  deliveredAt?: Date
  createdAt?: Date
}
```

- `create()` — síncrono, retorna `Either<never, Notification>` (validação nunca falha para tipos conhecidos)
- `restore()` — bypass de validação, usado ao carregar do banco
- `markAsRead()` — define `readAt = new Date()`
- `softDelete()` — define `deletedAt = new Date()`
- Getter `isRead: boolean` — `!!this.props.readAt`

### 3.3 Repository Interface

```typescript
export interface NotificationRepository {
  create(notification: Notification): Promise<void>
  findManyByUserId(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ notifications: Notification[]; nextCursor: string | null }>
  findUnreadCountByUserId(userId: string): Promise<number>
  findById(id: string): Promise<Notification | null>
  save(notification: Notification): Promise<void>
  markAllAsReadByUserId(userId: string): Promise<void>
  findAfterEventId(userId: string, lastEventId: string): Promise<Notification[]>
}
```

### 3.4 Use Cases

| Use Case | Input | Output |
|---|---|---|
| `GetNotificationsUseCase` | `{ userId, cursor?, limit? }` | `Either<never, { notifications, nextCursor }>` |
| `GetUnreadCountUseCase` | `{ userId }` | `Either<never, { count: number }>` |
| `MarkAsReadUseCase` | `{ userId, notificationId }` | `Either<NotificationNotFoundError, void>` |
| `MarkAllAsReadUseCase` | `{ userId }` | `Either<never, void>` |

### 3.5 Event Handler

`CreateNotificationOnCheckInEventHandler` — application layer, registrado via DI:

1. Constrói `Notification` com tipo e conteúdo baseado no evento recebido
2. `NotificationRepository.create(notification)`
3. `Queue.publish(EXCHANGES.NOTIFICATION_CREATED, { userId, notificationId })`

Conteúdo das notificações por tipo:

| Tipo | Title | Body | Severity |
|---|---|---|---|
| `CHECK_IN_APPROVED` | "Check-in aprovado ✅" | "Seu check-in foi validado em {gymName}" | `info` |
| `CHECK_IN_REJECTED` | "Check-in rejeitado ❌" | "Seu check-in foi rejeitado" | `warning` |
| `SECURITY_ALERT` | "Alerta de segurança 🔒" | "Nova atividade detectada na sua conta" | `critical` |

> `gymName` é obtido via `event.gymName` — o `CheckInApprovedEvent` e `CheckInRejectedEvent` devem carregar esse campo no payload. O handler não realiza queries adicionais para buscar o nome da academia.

### 3.6 Infraestrutura SSE

**`SseManager`** — singleton, mantém `Map<userId, Set<WritableStream>>`:

```typescript
class SseManager {
  private connections = new Map<string, Set<WritableStream>>()

  register(userId: string, stream: WritableStream): () => void // retorna cleanup
  fanout(userId: string, event: SseEvent): void
}
```

- Suporta múltiplas abas do mesmo usuário (Set de streams por userId)
- Cleanup automático ao fechar conexão SSE

**`RedisNotificationSubscriber`** — iniciado no bootstrap:

- `redisClient.duplicate()` — conexão dedicada para SUBSCRIBE
- `PSUBSCRIBE notifications:*` — uma subscrição por instância Fastify
- `pmessage` handler extrai `userId` do channel e chama `SseManager.fanout()`

**Wire format SSE:**
```
id: <notificationId>
event: notification
retry: 3000
data: {"notificationId":"<uuid>"}

```

> Thin payload — frontend invalida queries e busca dados frescos do REST.

### 3.7 Endpoints REST + SSE

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | ✅ | Lista paginada (cursor-based, limit=10) |
| `GET` | `/api/v1/notifications/unread-count` | ✅ | `{ count: number }` |
| `PATCH` | `/api/v1/notifications/:id/read` | ✅ | Marca uma notificação como lida |
| `PATCH` | `/api/v1/notifications/read-all` | ✅ | Marca todas as notificações do usuário como lidas |
| `GET` | `/api/v1/notifications/stream` | ✅ | SSE stream — `text/event-stream` |

### 3.8 Reconexão (`Last-Event-ID`)

```
EventSource reconecta → envia Last-Event-ID: <lastId>
    ↓
Fastify detecta header → NotificationRepository.findAfterEventId(userId, lastEventId)
    ↓
Replay das notificações perdidas como eventos SSE
    ↓
Entra no loop de SSE vivo
```

Garante que at-most-once do Redis Pub/Sub não cause perda de notificações visíveis.

### 3.9 Mudanças no Bounded Context `check-in/`

| Arquivo | Mudança |
|---|---|
| `check-in/domain/event/check-in-approved-event.ts` | **Criar** — evento publicado por `CheckInStatus.validate()` |
| `check-in/domain/value-object/check-in-status.ts` | Adicionar `DomainEventPublisher.publish(new CheckInApprovedEvent(...))` em `validate()` |
| `shared/domain/event/events.ts` | Adicionar `CHECK_IN_APPROVED` ao enum |

> `CheckInRejectedEvent` já existe e já é publicado por `CheckInStatus.reject()`. Só precisa de subscriber.

### 3.10 Prisma Schema

```prisma
model Notification {
  id        String   @id @default(uuid())
  type      String
  title     String
  body      String
  severity  String   @default("info")
  metadata  Json     @default("{}")
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())

  userNotifications UserNotification[]

  @@index([type, createdAt(sort: Desc)])
}

model UserNotification {
  id             String    @id @default(uuid())
  userId         String
  notificationId String
  readAt         DateTime?
  deletedAt      DateTime?
  deliveredAt    DateTime  @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@unique([userId, notificationId])
  @@index([userId, deliveredAt(sort: Desc)])
}
```

> Índice parcial `WHERE readAt IS NULL AND deletedAt IS NULL` criado via migration SQL raw (Prisma não suporta partial indexes nativamente).

### 3.11 Bootstrap

```typescript
// bootstrap/setup-notification-module.ts
export function setupNotificationModule(): void {
  DomainEventPublisher.instance.subscribe(
    EVENTS.CHECK_IN_APPROVED,
    (event) => container.get(CreateNotificationOnCheckInEventHandler).handle(event),
  )
  DomainEventPublisher.instance.subscribe(
    EVENTS.CHECK_IN_REJECTED,
    (event) => container.get(CreateNotificationOnCheckInEventHandler).handle(event),
  )

  container.get(RedisNotificationSubscriber).start(container.get(RedisClient))
}
```

Chamado em `server-build.ts` junto com os demais `setup*Module()`.

### 3.12 IoC

- Symbols em `shared/infra/ioc/module/service-identifier/notification-types.ts`
- Bindings em `notification/notification-module.ts` (ContainerModule Inversify)
- Repositório selecionado por provider pattern:
  - `DATABASE_PROVIDER=prisma` → `PrismaNotificationRepository`
  - `DATABASE_PROVIDER=in-memory` → `InMemoryNotificationRepository`

### 3.13 Error Handling & Resiliência

**RabbitMQ consumer falha ao persistir:**
- `ch.nack(msg, false, true)` → recoloca na fila
- Após N tentativas → Dead Letter Queue `notification.created.dlq`

**Redis `publish` falha após persistir:**
- Notificação salva no PostgreSQL ✅
- Catch-up automático via `Last-Event-ID` na próxima reconexão SSE

**Token expira durante SSE stream:**
- `fetchEventSource` recebe 401 → `onclose` callback
- `useNotificationStream` re-abre conexão após refresh de token via `useAuthStore`

---

## 4. Frontend

### 4.1 Estrutura de componentes

```
apps/frontend/src/
├── lib/notifications/
│   ├── use-notification-stream.ts    ← Hook 1: SSE connection
│   └── use-notifications.ts         ← Hook 2: dados do painel
└── components/notification/
    ├── notification-bell.tsx         ← Bell icon + badge + toggle
    ├── notification-dropdown.tsx     ← Lista + header + footer
    └── notification-item.tsx         ← Item individual (unread/read)
```

### 4.2 Hook 1 — `useNotificationStream`

Montado **uma única vez** na raiz do app autenticado. Abre a conexão SSE via `@microsoft/fetch-event-source` com `Authorization: Bearer <token>`. Ao receber evento `notification`, invalida as queries `['notifications']` e `['notifications', 'unread-count']`.

Reconecta automaticamente com `Last-Event-ID` ao perder conexão. Reabre com novo token após refresh via `useAuthStore`.

### 4.3 Hook 2 — `useNotifications`

Montado no `NotificationBell`. Expõe:

- `notifications` — lista flat das páginas carregadas
- `unreadCount` — badge count (`staleTime: Infinity`, invalidado via SSE)
- `hasNextPage / fetchNextPage` — paginação cursor-based
- `markAsRead(id)` — optimistic update: marca item como lido + decrementa badge
- `markAllAsRead()` — invalida ambas as queries após sucesso

### 4.4 Comportamento do Dropdown

- Exibe últimas **10** notificações (sem paginação no dropdown; "Ver histórico completo" navega para `/notificacoes`)
- Itens **não lidos**: dot colorido + fundo tinted por tipo (verde/vermelho/amarelo)
- Itens **lidos**: sem dot + opacity 50%
- Clique em item → `markAsRead(id)` optimistic + fecha dropdown
- Botão "Marcar todas lidas" → desabilitado quando `unreadCount === 0`
- Badge no sino: oculto quando `unreadCount === 0`

### 4.5 Dependência nova

```bash
pnpm --filter frontend add @microsoft/fetch-event-source
```

---

## 5. Testes

### Unit Tests (`*.test.ts`)

| Arquivo | Cobertura |
|---|---|
| `notification.test.ts` | `create()`, `markAsRead()`, `isRead`, `softDelete()` |
| `get-notifications.usecase.test.ts` | Paginação, filtro por userId, cursor-based |
| `get-unread-count.usecase.test.ts` | Contagem após mark-as-read |
| `mark-as-read.usecase.test.ts` | Sucesso; `NotificationNotFoundError` para id inválido; não permite marcar notif de outro usuário |
| `mark-all-as-read.usecase.test.ts` | Zera contagem apenas para o userId correto |
| `create-notification-on-check-in-event.handler.test.ts` | Persiste notificação + publica na queue para ambos os eventos |

### Business Flow Tests (`*.business-flow-test.ts`)

| Arquivo | Cenários |
|---|---|
| `get-notifications.business-flow-test.ts` | 401 sem token; 200 com lista; paginação |
| `get-unread-count.business-flow-test.ts` | 401 sem token; 200 com count correto |
| `mark-as-read.business-flow-test.ts` | 404 id inexistente; 204 sucesso |
| `mark-all-as-read.business-flow-test.ts` | 204 sucesso; unread-count zera |
| `notification-stream.business-flow-test.ts` | 401 sem token; 200 com `content-type: text/event-stream` |

---

## 6. Considerações Futuras

- **Producer de promoções**: endpoint admin `POST /notifications/broadcast` com `broadcast_notifications` table (fan-out on read)
- **Escala Redis**: migrar para `SSUBSCRIBE`/`SPUBLISH` (Sharded Pub/Sub) ao atingir Redis Cluster
- **Purge automático**: job agendado para hard-delete de notificações com `deletedAt` > 90 dias (conformidade GDPR)
- **Push notifications**: Web Push API para notificações quando o usuário está offline
