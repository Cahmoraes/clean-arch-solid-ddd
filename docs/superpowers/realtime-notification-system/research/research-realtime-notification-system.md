---
created_at: 2026-05-30T12:11:30-03:00
updated_at: 2026-05-30T12:11:30-03:00
---

# Pesquisa: Sistema de Notificação em Tempo Real (Bell Icon)

## 1. Questão & Escopo

**Pergunta central:** Como implementar um sistema de notificação com ícone de sino no header do frontend, com entrega em tempo real, para os tipos: check-in aprovado/rejeitado, promoções e alertas de segurança?

**Escopo acordado:**
- Stack existente: Fastify (Node.js) + Next.js 16 (React 19) + PostgreSQL (Prisma) + Redis (ioredis) + RabbitMQ
- Entrega: **em tempo real** (sem polling manual)
- Visão **end-to-end**: modelagem do banco, pipeline RabbitMQ → Redis → SSE, badge count no frontend
- Comparação de mecanismos de transporte (SSE vs WebSocket vs long polling)

---

## 2. Achados-Chave

### 2.1 Mecanismo de Transporte: SSE é a escolha correta

**Recomendação verificada por 4+ fontes independentes: usar SSE (Server-Sent Events).**

| Critério | Long Polling | WebSocket | **SSE** |
|---|---|---|---|
| Direção | Client pull | Bidirecional | **Server push** ✅ |
| Latência | Alta (3 round trips) | Baixa | **Baixa** ✅ |
| Auto-reconexão | Manual | Manual | **Nativa** ✅ |
| HTTP/2 multiplexing | Complexo | ❌ Não | **✅ Sim** |
| Compatibilidade firewall | ✅ | ❌ Bloqueado às vezes | **✅** |
| Overhead de cabeçalho | Muito alto | Baixo pós-handshake | **Baixo** ✅ |
| Adequação para notification bell | Overkill negativo | Overkill positivo | **Perfeito** ✅ |
| Suporte `Last-Event-ID` | Manual | Manual | **Nativo** ✅ |

**Por que não WebSocket:** Nenhuma mensagem precisa ir do cliente para o servidor via canal de notificações — "marcar como lida" é uma chamada REST separada. WebSocket é bidirecional, o que é desperdício para notificações. Além disso, WebSocket não se multiplexar sobre HTTP/2, aumentando o número de conexões TCP por aba.

**Por que não Long Polling:** Latência 3× maior que SSE, overhead de cabeçalhos HTTP completos por evento (15 KB de cabeçalho para 5 KB de dados — caso documentado pela Smashing Magazine), pior CPU/memória sob carga.

**Integração com Fastify:** plugin `fastify-sse-v2` adiciona `reply.sse()` com suporte a `AsyncIterable`. Alternativa nativa: `reply.hijack()` + `reply.raw` sem dependência adicional.

**Wire format SSE:**
```
id: 42
event: notification
retry: 3000
data: {"type":"CHECK_IN_APPROVED","title":"Check-in aprovado!","count":3}

```
_(mensagem terminada por `\n\n`)_

---

### 2.2 Schema PostgreSQL: Padrão Normalizado (Junction Table)

**Recomendação: hybrid — fan-out on write para notificações direcionadas, fan-out on read para broadcasts.**

#### Tabela de notificações (conteúdo)
```sql
CREATE TABLE notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(50) NOT NULL,  -- 'CHECK_IN_APPROVED' | 'CHECK_IN_REJECTED' | 'PROMOTION' | 'SECURITY_ALERT'
  title        VARCHAR(200) NOT NULL,
  body         TEXT         NOT NULL,
  severity     VARCHAR(20)  NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'critical'
  metadata     JSONB        DEFAULT '{}',
  is_deleted   BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

#### Tabela junction (estado por usuário)
```sql
CREATE TABLE user_notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID        NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ,          -- NULL = não lido
  archived_at     TIMESTAMPTZ,          -- NULL = não arquivado
  deleted_at      TIMESTAMPTZ,          -- NULL = não removido (soft delete)
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);
```

#### Tabela para broadcasts (fan-out on read)
```sql
CREATE TABLE broadcast_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  metadata    JSONB        DEFAULT '{}',
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ  -- expiração automática
);

CREATE TABLE broadcast_dismissals (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES broadcast_notifications(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, notification_id)
);
```

#### Índices críticos (verificados em Discourse + Forem)
```sql
-- Acesso primário: notificações não lidas para o usuário X
-- Partial index — só indexa linhas onde read_at IS NULL
CREATE INDEX idx_user_notifications_unread
  ON user_notifications (user_id, delivered_at DESC)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- Timeline geral: todas as notificações do usuário X paginadas
CREATE INDEX idx_user_notifications_user_delivered
  ON user_notifications (user_id, delivered_at DESC);

-- Discourse-style: ordenação de menu (alta prioridade não lida primeiro)
CREATE INDEX idx_notifications_user_menu_ordering
  ON notifications (type, created_at DESC)
  WHERE is_deleted = false;
```

#### Em Prisma schema
```prisma
model Notification {
  id         String   @id @default(uuid())
  type       String
  title      String
  body       String
  severity   String   @default("info")
  metadata   Json     @default("{}")
  isDeleted  Boolean  @default(false)
  createdAt  DateTime @default(now())

  userNotifications UserNotification[]

  @@index([type, createdAt(sort: Desc)], map: "idx_notifications_type_created")
}

model UserNotification {
  id             String    @id @default(uuid())
  userId         String
  notificationId String
  readAt         DateTime?
  archivedAt     DateTime?
  deletedAt      DateTime?
  deliveredAt    DateTime  @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@unique([userId, notificationId])
  @@index([userId, deliveredAt(sort: Desc)], map: "idx_user_notifs_user_delivered")
}
```

**Por que soft delete:** rastreabilidade de alertas de segurança, capacidade de desfazer, conformidade GDPR (retenção obrigatória de logs de segurança). Discourse usa `purge_old!` para hard-delete agendado após período de retenção (ex: 90 dias).

---

### 2.3 Pipeline RabbitMQ + Redis Pub/Sub: Duas Camadas Complementares

**Recomendação verificada: RabbitMQ = durabilidade, Redis Pub/Sub = fan-out em tempo real.**

```
Evento de Domínio (CheckInApproved)
         │
         ▼
[CAMADA 1 — DURABILIDADE]
RabbitMQ Exchange (topic: 'domain.events')
    └── Queue: 'notification-worker' (durable, quorum)
         │  at-least-once, retry, DLQ
         ▼
Notification Consumer Worker
    1. Persiste no PostgreSQL (fonte da verdade)
    2. redis.publish(`notifications:${userId}`, payload)
    3. ch.ack(msg) — só após publish bem-sucedido
         │
         ▼
[CAMADA 2 — FAN-OUT EM TEMPO REAL]
Redis Pub/Sub channel: `notifications:{userId}`
    │
    ├──► Fastify Instance 1 (subscribed via PSUBSCRIBE)
    │       → SSE write para clientes conectados com esse userId
    ├──► Fastify Instance 2
    │       → SSE write (se o usuário está conectado aqui)
    └──► Fastify Instance N
             → silencia se ninguém dessa instância é o usuário
         │
         ▼
Browser → EventSource recebe evento
→ queryClient.invalidateQueries(['notifications'])
```

**Por que não apenas RabbitMQ para entregar ao browser:** RabbitMQ não fala HTTP/SSE diretamente. O consumer precisa de um mecanismo para chegar às conexões SSE vivas que estão em memória de cada instância Fastify.

**Por que não apenas Redis Pub/Sub para tudo:** Redis Pub/Sub é at-most-once — se o consumer estiver offline, a mensagem se perde. RabbitMQ garante que o evento não seja perdido enquanto o consumer processa.

**Propriedades do Redis Pub/Sub a considerar:**
- **At-most-once**: mensagem entregue no instante — se o subscriber estiver offline, é perdida permanentemente
- **Mitigação**: usar `Last-Event-ID` no SSE + query de catch-up no PostgreSQL ao reconectar
- **1 conexão Redis por subscriber**: conexão em modo SUBSCRIBE não pode emitir outros comandos — usar `ioredis.duplicate()` para criar uma conexão dedicada por SSE handler, ou `PSUBSCRIBE notifications:*` uma vez por instância Fastify
- **Cluster (Redis 7.0+):** Sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`) para escalar horizontalmente

---

### 2.4 Padrão Full-Stack: Domain Events → Notification → SSE → React

#### Gap crítico encontrado no codebase atual

| Arquivo | Situação |
|---|---|
| `check-in/domain/event/check-in-created-event.ts` | ✅ Existe |
| `check-in/domain/event/check-in-rejected-event.ts` | ✅ Existe — mas **nunca é publicado** |
| `CheckInApprovedEvent` / `CheckInValidatedEvent` | ❌ **Não existe** |
| `validate-check-in.usecase.ts` | Chama `checkIn.validate()` mas **não publica evento** |
| `reject-check-in.usecase.ts` | Chama `checkIn.reject()` mas **não publica evento** |
| Bounded context `notification/` | ❌ **Não existe** |

#### Fluxo completo recomendado (DDD + Clean Architecture)

```
CheckIn.validate() / CheckIn.reject()
    → DomainEventPublisher.publish(CheckInApprovedEvent / CheckInRejectedEvent)
         │
         ▼ (subscriber registrado no bootstrap, camada infra)
CreateNotificationOnCheckInApproved (Application Layer Handler)
    1. NotificationRepository.create(notification)   ← persiste
    2. Queue.publish(EXCHANGES.NOTIFICATION_CREATED, { userId, notificationId })  ← enfileira
         │
         ▼ (RabbitMQ consumer — worker separado ou mesma instância)
NotificationWorker.consume()
    1. redis.publish(`notifications:${userId}`, thinPayload)
    2. ch.ack()
         │
         ▼ (Fastify SSE endpoint — 1 por instância, PSUBSCRIBE no start)
GET /api/v1/notifications/stream
    → SSE write se userId conectado nesta instância
         │
         ▼ (Next.js, Client Component)
useNotificationStream()  ← montado 1x na raiz do app (pós-auth)
    → queryClient.invalidateQueries(['notifications'])
    → queryClient.invalidateQueries(['notifications', 'unread-count'])

useNotifications()  ← montado no panel do sino
    → useInfiniteQuery(['notifications'])  ← lista paginada
    → useQuery(['notifications', 'unread-count'])  ← badge count
    → useMutation markAsRead  ← optimistic update via setQueryData
```

#### Constraint da Clean Architecture
O domain **não pode depender de infra**. A publicação de eventos de domínio (`DomainEventPublisher.publish`) é feita na camada de domínio, mas o subscriber que persiste notificações deve viver na camada de **infra**, wired no bootstrap:

```typescript
// bootstrap/notification-subscriptions.ts  (NOVO ARQUIVO — infra layer)
export function registerNotificationSubscriptions(): void {
  DomainEventPublisher.instance.subscribe(
    EVENTS.CHECK_IN_VALIDATED,
    (event) => container.get(CreateNotificationHandler).handle(event)
  );
  DomainEventPublisher.instance.subscribe(
    EVENTS.CHECK_IN_REJECTED,
    (event) => container.get(CreateNotificationHandler).handle(event)
  );
  DomainEventPublisher.instance.subscribe(
    EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
    (event) => container.get(CreateNotificationHandler).handle(event)
  );
}
```

#### Frontend: dois hooks desacoplados (padrão verificado em produção)

```typescript
// Hook 1 — montado 1x na raiz do app (pós-auth)
// Abre SSE, invalida queries ao receber evento
function useNotificationStream(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/stream`,
      { withCredentials: true }  // envia cookies JWT
    )
    es.addEventListener('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    })
    return () => es.close()
  }, [queryClient])
}

// Hook 2 — montado no panel do sino
function useNotifications() {
  const qc = useQueryClient()

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => api.get(`/notifications?cursor=${pageParam ?? ''}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    staleTime: Infinity, // SSE invalida — sem polling
  })

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_, id) => {
      // Optimistic update: atualiza lista e badge simultaneamente
      qc.setQueryData(['notifications'], updateListItemRead(id))
      qc.setQueryData(['notifications', 'unread-count'],
        (old: { count: number }) => ({ count: Math.max(0, old.count - 1) })
      )
    },
  })

  return {
    notifications: data?.pages.flatMap(p => p.items) ?? [],
    unreadCount: unreadData?.count ?? 0,
    hasNextPage,
    fetchNextPage,
    markAsRead: (id: string) => markAsRead.mutate(id),
  }
}
```

#### Autenticação no SSE
`EventSource` **não suporta headers customizados**. Soluções:
1. **Cookie HttpOnly (preferido):** `withCredentials: true` envia cookies automaticamente — requer `@fastify/cors` com `credentials: true` e `origin` configurado
2. **Query param:** `?token=<jwt>` — funciona mas o token fica visível em logs de servidor. Aceito se o token tiver TTL curto

---

### 2.5 Anti-padrões a Evitar

| Anti-padrão | Problema |
|---|---|
| Push do payload completo via SSE (em vez de thin signal) | Notificação pode chegar antes de ser persistida; dados desatualizados no cache |
| Um Redis SUBSCRIBE por conexão SSE | N usuários = N conexões Redis por instância; usar `PSUBSCRIBE notifications:*` por instância |
| `staleTime: 0` na query de unread count | Refetches agressivos desnecessários; SSE já invalida |
| Polling long como fallback sempre ativo | Aumenta carga em 3-10x desnecessariamente |
| Hard delete imediato de alertas de segurança | Viola auditoria, impossibilita debugging |
| WebSocket para notificações unidirecionais | Overkill — sem retorno de comunicação do browser via WS; complica auth hooks |

---

## 3. Fontes

| # | Título | URL | Tipo |
|---|---|---|---|
| 1 | MDN: Using Server-Sent Events | https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events | Spec oficial |
| 2 | WHATWG HTML Living Standard §9.2 — SSE | https://html.spec.whatwg.org/multipage/server-sent-events.html | Spec oficial |
| 3 | RFC 6455 — The WebSocket Protocol | https://datatracker.ietf.org/doc/html/rfc6455 | RFC |
| 4 | Ably: WebSockets vs SSE | https://ably.com/blog/websockets-vs-sse | Análise técnica |
| 5 | Smashing Magazine: SSE, WebSockets, Data Flow and HTTP/2 | https://www.smashingmagazine.com/2018/02/sse-websockets-data-flow-http2/ | Case study produção |
| 6 | LogRocket: Server-Sent Events vs WebSockets | https://blog.logrocket.com/server-sent-events-vs-websockets/ | Análise comparativa |
| 7 | fastify-sse-v2 (NodeFactoryIo) | https://github.com/NodeFactoryIo/fastify-sse-v2 | Plugin Fastify SSE |
| 8 | Fastify Reply — `.hijack()` | https://fastify.dev/docs/latest/Reference/Reply/#hijack | Docs oficiais |
| 9 | Redis Pub/Sub Documentation | https://redis.io/docs/latest/develop/pubsub/ | Docs oficiais |
| 10 | Redis Streams Documentation | https://redis.io/docs/latest/develop/data-types/streams/ | Docs oficiais |
| 11 | Socket.IO Redis Adapter | https://socket.io/docs/v4/redis-adapter/ | Padrão produção |
| 12 | RabbitMQ Exchanges | https://www.rabbitmq.com/docs/exchanges | Docs oficiais |
| 13 | RabbitMQ Fanout Tutorial (JavaScript) | https://www.rabbitmq.com/tutorials/tutorial-three-javascript | Tutorial oficial |
| 14 | Discourse Notification Schema | `discourse/discourse:app/models/notification.rb` | OSS produção (6M+ installs) |
| 15 | Forem (dev.to) Notification Schema | `forem/forem:db/schema.rb:1074-1096` | OSS produção (~1M usuários) |
| 16 | TkDodo: Using WebSockets with React Query | https://tkdodo.eu/blog/using-web-sockets-with-react-query | Guia canônico |
| 17 | TanStack Query: Optimistic Updates | https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates | Docs oficiais |
| 18 | Chris Richardson: Transactional Outbox Pattern | https://microservices.io/patterns/data/transactional-outbox.html | Padrão microservices |
| 19 | Next.js: Server and Client Components | https://nextjs.org/docs/app/getting-started/server-and-client-components | Docs oficiais |
| 20 | ioredis README | https://github.com/redis/ioredis/blob/main/README.md | Docs biblioteca |

---

## 4. Questões em Aberto

1. **Manutenção do `fastify-sse-v2`:** O plugin está sob `NodeFactoryIo` (não o org oficial `fastify`). Verificar data do último publish npm e issues abertos antes de adotar em produção. Alternativa segura: `reply.hijack()` nativo (zero dependência adicional).

2. **Escala de conexões Redis:** 1.000 usuários simultâneos por instância Fastify = 1.000 subscrições Redis (se usar `SUBSCRIBE` individual). Alternativa recomendada: `PSUBSCRIBE notifications:*` — uma subscrição por instância Fastify, filtrar userId no handler. Monitorar via `redis-cli INFO clients`.

3. **Deploy serverless (Vercel):** `EventSource` direto ao backend Fastify (diferente origin) evita o problema de timeout de funções serverless. Proxy SSE via Next.js Route Handler bateria no limite de execução (~60s no plano Pro).

4. **Volume de broadcast (promoções):** Para promoções enviadas a todos os usuários, usar a tabela `broadcast_notifications` + `broadcast_dismissals` (fan-out on read) em vez de inserir uma linha por usuário na `user_notifications`. O custo de escrita diminui de O(N usuários) para O(1).

5. **`EventSource` e CORS:** `withCredentials: true` dispara CORS preflight. O Fastify precisa de `@fastify/cors` configurado com `origin: <next.js-url>` e `credentials: true`.

---

## 5. Recomendação / Implicações para o Design

### Decisões arquiteturais consolidadas

| Camada | Escolha | Justificativa |
|---|---|---|
| **Transporte** | SSE (`text/event-stream`) | Unidirecional, HTTP-nativo, auto-reconexão, HTTP/2 compatível |
| **Plugin Fastify** | `fastify-sse-v2` ou `reply.hijack()` nativo | `reply.sse()` com `AsyncIterable`; nativo tem zero dependências |
| **Autenticação SSE** | Cookie HttpOnly + `withCredentials: true` | `EventSource` não suporta headers; cookies funcionam com CORS |
| **Fan-out horizontal** | Redis `PSUBSCRIBE notifications:*` por instância Fastify | Uma subscrição por processo, sem explosão de conexões |
| **Durabilidade** | RabbitMQ (já existe no projeto) | At-least-once, retry, DLQ — não perder eventos quando consumer está down |
| **Persistência** | PostgreSQL — tabelas `notifications` + `user_notifications` | Fonte da verdade; catch-up na reconexão via `Last-Event-ID` |
| **Broadcast (promoções)** | `broadcast_notifications` + `broadcast_dismissals` | Fan-out on read: 1 linha por promoção, sem amplificação de escrita |
| **Estado por usuário** | Múltiplos timestamps: `read_at`, `archived_at`, `deleted_at` | Auditabilidade de alertas de segurança; soft delete |
| **Frontend: SSE hook** | `useNotificationStream()` 1x na raiz do app | Thin signal → invalida queries, não carrega payload completo |
| **Frontend: dados** | `useInfiniteQuery + useQuery (unread-count)` | Cache centralizado; `staleTime: Infinity` + invalidação via SSE |
| **Marcar como lida** | Optimistic update via `setQueryData` em `onSuccess` | Badge count e lista refletem mudança imediatamente sem reload |

### Novo bounded context necessário

Um bounded context `notification/` deve ser criado no backend com:
- `notification/domain/notification.ts` — Entidade Notification
- `notification/application/event-handler/` — handlers dos domain events
- `notification/application/use-case/` — get, mark-as-read, mark-all-as-read, delete
- `notification/infra/controller/` — endpoints REST + SSE stream
- `notification/infra/repository/` — Prisma + in-memory

### Domain events faltantes que precisam ser criados

- `CheckInApprovedEvent` (atualmente inexistente)
- `CheckInRejectedEvent` já existe mas nunca é publicado pelo domain — precisa ser wired

### Fluxo de reconexão (resiliência)

```
EventSource reconecta automaticamente (nativo)
    → envia header Last-Event-ID: <lastId>
         ↓
Fastify SSE endpoint detecta o header
    → SELECT * FROM user_notifications
      JOIN notifications ON ...
      WHERE un.user_id = $userId
        AND n.created_at > (SELECT created_at FROM notifications WHERE id = $lastEventId)
        AND un.deleted_at IS NULL
      ORDER BY n.created_at ASC
    → replay das notificações perdidas como eventos SSE
         ↓
Browser atualizado sem perda de dados
```

Este design garante que o Redis Pub/Sub at-most-once não cause perda de notificações visíveis ao usuário.
