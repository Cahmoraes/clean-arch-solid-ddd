---
created_at: "2026-07-07T15:56:38-03:00"
updated_at: "2026-07-07T15:56:38-03:00"
---

# Design: Remoção do Redis Pub/Sub do Broadcast de Notificações (RabbitMQ Fanout)

## 1. Visão Geral

Refactor do bounded context `notification` (`apps/backend/src/notification/`) para remover o
Redis Pub/Sub do fluxo de entrega em tempo real, sem regressão de funcionalidade. Hoje o
broadcast multi-instância (necessário porque o `SseManager` mantém as conexões SSE em memória,
por processo) é feito via `PSUBSCRIBE notifications:*` no Redis. Esta feature substitui essa
peça por uma exchange fanout do RabbitMQ, com uma fila exclusiva/auto-delete por instância —
consolidando durabilidade e broadcast multi-instância em um único broker.

O Redis **não é removido do projeto**: continua em uso para rate-limit
(`rate-limit-plugin.ts`) e BullMQ (`bullmq-adapter.ts`). Só os componentes específicos deste
fluxo (`RedisNotificationPublisher`, `RedisNotificationSubscriber`) são removidos.

**Fora do escopo:**
- Qualquer mudança em `SseManager` (mantém `Map<userId, Set<SseClient>>` e cleanup existentes, inalterado)
- Qualquer mudança nos endpoints REST/SSE do bounded context `notification`
- Migração de outros bounded contexts para exchanges fanout (os 7 exchanges `direct` existentes continuam `direct`)
- Remoção do Redis do projeto (permanece para rate-limit e BullMQ)

---

## Características Arquiteturais

**Priorizadas:**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Simplicidade operacional | Motivo explícito do refactor: eliminar o Redis Pub/Sub deste fluxo | Uma peça de infraestrutura a menos no pipeline de broadcast; `RedisNotificationPublisher`/`RedisNotificationSubscriber` removidos do bounded context |
| Confiabilidade / robustez | Não pode haver regressão na entrega em tempo real existente | Todos os testes de `notification-stream.controller.business-flow-test.ts` e dos use-cases continuam passando; broadcast permanece best-effort com catch-up via `Last-Event-ID`, sem perda de dado no Postgres |
| Escalabilidade horizontal | Suportar N instâncias Fastify recebendo o broadcast, sem número fixo configurado | Fila exclusiva nova criada automaticamente por instância ao subir, sem configuração manual por instância |
| Manutenibilidade / testabilidade | Reuso do `RabbitMQAdapter` já testado; menor superfície de código nova | `RabbitMQAdapter` mantém compatibilidade retroativa (`type: 'direct'` como default) para os 7 exchanges existentes |

**Consideradas, não priorizadas:** nenhuma — as quatro candidatas identificadas foram todas priorizadas pelo usuário.

---

## 2. Arquitetura

### 2.1 Fluxo end-to-end (proposto)

```
CheckIn.validate() / CheckIn.reject()
    → DomainEventPublisher.publish(CheckInApprovedEvent | CheckInRejectedEvent)
         ↓ (subscriber wired no bootstrap — inalterado)
CreateNotificationOnCheckInEventHandler   [application layer — inalterado]
    1. NotificationRepository.create(notification)   → persiste no PostgreSQL
    2. RabbitMQAdapter.publish(EXCHANGES.NOTIFICATION_CREATED, type: 'direct', { userId, notificationId })
         ↓ (fila durável — inalterada)
NotificationQueueWorker.handle(msg)   [muda apenas o destino de publicação]
    1. NotificationBroadcastPublisher.publish(thinPayload)
       → RabbitMQAdapter.publish(EXCHANGES.NOTIFICATION_BROADCAST, type: 'fanout', thinPayload)
    2. ch.ack()   — só após publish bem-sucedido na fanout, mesma política de hoje
         ↓ (exchange fanout — entrega para toda fila vinculada)
NotificationBroadcastSubscriber   [NOVO — 1 por instância Fastify]
    → amqp-connection-manager: callback `setup` declara exchange fanout + fila exclusiva/
      auto-delete desta instância + bind — redeclarado automaticamente a cada reconexão
    → consome a fila e chama SseManager.fanout(userId, event)
         ↓
SseManager.fanout(userId, event)   [inalterado]
    → Map<userId, Set<SseClient>>.get(userId)?.forEach(client => client.raw.write())
         ↓
GET /api/v1/notifications/stream   [inalterado]
    → useNotificationStream() no Next.js — invalida queries TanStack Query
```

### 2.2 Componentes (mudanças)

| Componente | Responsabilidade | Depende de | O que muda |
|---|---|---|---|
| `RabbitMQAdapter` (existente, `shared/infra/queue/`) | Publicar/consumir mensagens AMQP, parametrizando o tipo de exchange | `amqplib` | Ganha parâmetro `type: 'direct' \| 'fanout'`, default `'direct'` — 7 exchanges existentes continuam intocados |
| `NotificationQueueWorker` (existente) | Consumir a fila durável `notificationCreated` e disparar a entrega em tempo real | `RabbitMQAdapter`, `NotificationBroadcastPublisher` | Troca `RedisNotificationPublisher.publish()` por `NotificationBroadcastPublisher.publish()`, mesmo payload |
| `NotificationBroadcastPublisher` (novo, `notification/infra/queue/`) | Publicar o payload na exchange fanout `notificationBroadcast` | `RabbitMQAdapter` | Substitui `RedisNotificationPublisher` |
| `NotificationBroadcastSubscriber` (novo, `notification/infra/queue/`) | Declarar a fila exclusiva/auto-delete desta instância via `amqp-connection-manager`, consumir e repassar ao `SseManager` local | `amqp-connection-manager`, `SseManager` | Substitui `RedisNotificationSubscriber` |
| `SseManager` (existente, `notification/infra/sse/`) | Manter `Map<userId, Set<SseClient>>` e entregar via SSE; cleanup em `remove()` e detecção de client morto em `send()` | — | **Sem mudanças** |

**Removidos:** `notification/infra/redis/redis-notification-publisher.ts`,
`notification/infra/redis/redis-notification-subscriber.ts`, e a inicialização correspondente em
`bootstrap/setup-notification-module.ts`.

### 2.3 Estrutura de arquivos (diff)

```diff
notification/infra/
- redis/
-   ├── redis-notification-publisher.ts
-   └── redis-notification-subscriber.ts
+ queue/
+   ├── notification-broadcast-publisher.ts
+   └── notification-broadcast-subscriber.ts
  sse/
    ├── sse-manager.ts        (inalterado)
    └── sse-manager.test.ts   (inalterado)
  worker/
    └── notification-queue-worker.ts   (muda só a dependência: RedisNotificationPublisher → NotificationBroadcastPublisher)
```

`shared/infra/queue/exchanges.ts` ganha `NOTIFICATION_BROADCAST` (tipo `fanout`); `queue-setup.ts`
ganha suporte a declarar exchange do tipo `fanout` sem fila fixa (a fila é declarada
dinamicamente por instância, não no setup estático dos outros 6 exchanges).

---

## Decisões Arquiteturais

### D1. Pipeline em dois estágios (fila durável + fanout), não estágio único

- **Contexto:** alternativas eram (a) manter a fila durável `notificationCreated` existente e
  adicionar uma exchange fanout só para o broadcast; ou (b) remover a fila durável e publicar
  direto na fanout a partir do `CreateNotificationOnCheckInEventHandler`.
- **Decisão:** (a) — dois estágios.
- **Justificativa técnica:** preserva a garantia de durabilidade atual — a notificação não se
  perde caso todas as instâncias estejam momentaneamente fora do ar, pois fica retida na fila
  durável até um worker processá-la.
- **Justificativa de negócio:** troca isolada e de baixo risco — só muda o destino de publicação
  do worker existente, sem tocar no handler que persiste a notificação.
- **Trade-offs aceitos:** mantém duas peças de infraestrutura RabbitMQ em vez de uma só; a
  alternativa (b) economizaria essa peça extra, mas custaria a garantia de durabilidade e
  misturaria a responsabilidade de persistir com a de fazer broadcast no mesmo handler.

### D2. `amqp-connection-manager` para a fila exclusiva

- **Contexto:** a fila exclusiva/auto-delete de cada instância precisa ser redeclarada e
  re-vinculada à exchange fanout a cada reconexão AMQP. O `RabbitMQAdapter` atual usa `amqplib`
  puro, sem reconexão automática.
- **Decisão:** adotar `amqp-connection-manager` (nova dependência) no
  `NotificationBroadcastSubscriber`, usando o callback `setup` para redeclarar
  exchange + fila + bind a cada reconexão.
- **Justificativa técnica:** padrão consolidado em produção para este caso exato (backplane de
  broadcast multi-instância); reduz código próprio de reconexão/backoff.
- **Justificativa de negócio:** menor risco de bugs sutis de reconexão escritos à mão.
- **Trade-offs aceitos:** dependência nova no `apps/backend/package.json`; validar compatibilidade
  com `amqplib@2.0.1` já usado no projeto.

### D3. Generalizar `RabbitMQAdapter` para aceitar tipo de exchange

- **Contexto:** hoje só suporta `'direct'` (hardcoded), usado pelos 7 exchanges existentes,
  todas `durable=true`.
- **Decisão:** adicionar parâmetro `type: 'direct' | 'fanout'`, default `'direct'`
  retrocompatível.
- **Justificativa técnica:** reaproveita o adapter já testado em vez de duplicar lógica de
  conexão AMQP em um componente paralelo.
- **Justificativa de negócio:** menor superfície de código nova para revisar e manter.
- **Trade-offs aceitos:** qualquer regressão no adapter generalizado pode, em tese, afetar
  também os 7 exchanges `direct` existentes — mitigado mantendo o default retrocompatível e
  cobrindo com teste de regressão dos fluxos `direct` atuais.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Perda de broadcast durante janela de reconexão AMQP de uma instância | 1 | 2 | 2 🟢 | Mesma característica best-effort que o Redis Pub/Sub já tinha; catch-up via `Last-Event-ID` + Postgres como fonte da verdade cobre o caso — sem perda de dado, só atraso pontual na entrega em tempo real |
| Nova dependência `amqp-connection-manager` incompatível com `amqplib@2.0.1` | 2 | 1 | 2 🟢 | Validar compatibilidade de versões antes de integrar; testes de integração cobrindo reconexão |
| Regressão no `RabbitMQAdapter` generalizado afeta os 7 exchanges `direct` existentes | 3 | 1 | 3 🟡 | Default `'direct'` retrocompatível; suíte de testes de regressão dos fluxos existentes roda antes do merge |
| Custo operacional de N filas exclusivas simultâneas (uma por instância) | 1 | 1 | 1 🟢 | Filas exclusivas não persistem mensagem em disco nem replicam entre nós; RabbitMQ suporta dezenas de milhares de filas em produção — irrelevante na escala atual (poucas instâncias) |

---

## 3. Testes

### Novos / atualizados

| Arquivo | Cobertura |
|---|---|
| `notification-broadcast-publisher.test.ts` (novo) | Publica na exchange fanout correta com o payload esperado |
| `notification-broadcast-subscriber.test.ts` (novo) | Declara fila exclusiva, consome mensagem, repassa para `SseManager.fanout()`; redeclaração após reconexão simulada |
| `notification-queue-worker.test.ts` (atualizado) | Troca mock de `RedisNotificationPublisher` por `NotificationBroadcastPublisher` |
| Teste de integração novo | Publish na fanout → múltiplas filas exclusivas simuladas (≥2 "instâncias") recebem o mesmo payload |

### Inalterados (devem continuar passando sem modificação)

- `sse-manager.test.ts` — testa só a entrega local, não depende do transporte
- `notification-stream.controller.business-flow-test.ts` — protocolo HTTP/SSE, auth, CORS
- Todos os testes de use-case (`get-notifications`, `get-unread-count`, `mark-as-read`, `mark-all-as-read`)
- `create-notification-on-check-in-event.handler.test.ts` — publica na fila durável, inalterado

---

## 4. Dependências

```bash
pnpm --filter backend add amqp-connection-manager
```

Remove (se não usadas em mais nada do bounded context após o refactor):
`notification/infra/redis/redis-notification-publisher.ts` e
`redis-notification-subscriber.ts`. O cliente Redis compartilhado (`shared/infra/database/redis/redis-adapter.ts`)
**não é removido** — continua em uso por rate-limit e BullMQ.
