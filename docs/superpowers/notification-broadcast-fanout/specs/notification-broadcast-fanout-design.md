---
created_at: "2026-07-07T15:56:38-03:00"
updated_at: "2026-07-08T21:50:22-03:00"
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
| Confiabilidade / robustez | Não pode haver regressão na entrega em tempo real existente | Todos os testes de `notification-stream.controller.business-flow-test.ts` e dos use-cases continuam passando; broadcast permanece best-effort (sem catch-up automático via `Last-Event-ID` — mecanismo inexistente hoje no backend e no frontend, fora do escopo criar aqui), com o Postgres como fonte da verdade: a notificação perdida na janela de reconexão fica disponível na próxima leitura via `GET /api/v1/notifications` |
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
    2. queue.publish(EXCHANGES.NOTIFICATION_CREATED, { userId, notificationId, ... })
       — chamada de hoje, 2 argumentos (exchange, data); inalterada por este refactor.
         ↓ (fila durável — inalterada)
NotificationQueueWorker.init()   [callback passado a queue.consume; muda apenas o destino de publicação]
    1. NotificationBroadcastPublisher.publish(payload)
       → queue.publish(EXCHANGES.NOTIFICATION_BROADCAST, payload, 'fanout', false)
       payload = o `NotificationCreatedPayload` completo recebido do `queue.consume`
       (`notificationId`, `userId`, `type`, `title`, `message`), repassado sem transformação —
       é o mesmo objeto que hoje o worker serializa e publica no canal Redis
       (`RedisNotificationPublisher.publish`). Não há "thin payload": o worker já tem o payload
       completo em mãos e apenas troca o destino de publicação, então o contrato do evento SSE
       consumido pelo frontend (`notificationId`/`userId`/`type`/`title`/`message`, todos
       obrigatórios em `isNotificationStreamPayload`) realmente não muda.
       `durable: false` explícito (4º argumento) — ver D3/D4, mesmo valor usado pelo subscriber.
    2. ch.ack()   — só após publish bem-sucedido na fanout, mesma política de hoje
         ↓ (exchange fanout — entrega para toda fila vinculada)
NotificationBroadcastSubscriber   [NOVO — 1 por instância Fastify]
    → amqp-connection-manager: callback `setup` declara exchange fanout (`durable: false`,
      ver D4) + fila exclusiva/auto-delete desta instância + bind — redeclarado
      automaticamente a cada reconexão
    → consome a fila e chama SseManager.send(userId, event)
    → NotificationBroadcastSubscriber.start() é chamado em setup-notification-module.ts,
      no mesmo ponto onde hoje redisNotificationSubscriber.subscribe() é chamado
         ↓
SseManager.send(userId, event)   [inalterado — método já existente hoje, sem novo método
`fanout`; o "fanout" é uma característica da exchange RabbitMQ, não do SseManager]
    → Map<userId, Set<SseClient>>.get(userId)?.forEach(client => client.raw.write())
         ↓
GET /api/v1/notifications/stream   [inalterado]
    → useNotificationStream() no Next.js — invalida queries TanStack Query
```

### 2.2 Componentes (mudanças)

| Componente | Responsabilidade | Depende de | O que muda |
|---|---|---|---|
| `Queue` (interface, `shared/infra/queue/queue.ts`) | Contrato de publicação/consumo usado por todo o código de aplicação, implementado por `RabbitMQAdapter`/`BullMQAdapter`/`QueueMemoryAdapter` | — | `publish<TData>` ganha dois parâmetros opcionais: `type: 'direct' | 'fanout' = 'direct'` e `durable: boolean = true` — `BullMQAdapter` e `QueueMemoryAdapter` aceitam (e ignoram) os novos parâmetros para preservar o contrato da interface |
| `RabbitMQAdapter` (existente, `shared/infra/queue/`) | Publicar/consumir mensagens AMQP, parametrizando o tipo de exchange | `amqplib` | Ganha parâmetros `type: 'direct' | 'fanout'` (default `'direct'`) e `durable: boolean` (default `true`) — 7 exchanges existentes continuam intocados |
| `NotificationQueueWorker` (existente) | Consumir a fila durável `notificationCreated` e disparar a entrega em tempo real | `Queue` (via `SHARED_TYPES.Queue`), `NotificationBroadcastPublisher` | Troca `RedisNotificationPublisher.publish()` por `NotificationBroadcastPublisher.publish()`, mesmo payload |
| `NotificationBroadcastPublisher` (novo, `notification/infra/queue/`) | Publicar o payload na exchange fanout `notificationBroadcast` | `Queue` (interface, injetada via `SHARED_TYPES.Queue` — não a classe concreta `RabbitMQAdapter`, preservando o padrão de injeção por abstração do restante do projeto), `SHARED_TYPES.Logger` | Substitui `RedisNotificationPublisher`; loga eventos de publish/erro via `Logger` (mesmo padrão do `RabbitMQAdapter`) |
| `NotificationBroadcastSubscriber` (novo, `notification/infra/queue/`) | Declarar a fila exclusiva/auto-delete desta instância via `amqp-connection-manager`, consumir e repassar ao `SseManager` local | `amqp-connection-manager`, `SseManager`, `SHARED_TYPES.Logger` | Substitui `RedisNotificationSubscriber`; loga eventos de `connect`/`disconnect`/`error` do `amqp-connection-manager` (mesmo padrão do `RabbitMQAdapter`) |
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

`shared/infra/queue/exchanges.ts` ganha `NOTIFICATION_BROADCAST` (tipo `fanout`). `queue-setup.ts`
**não é alterado**: a exchange `notificationBroadcast` não entra no setup estático dos outros 6
exchanges (que sempre têm fila fixa vinculada). Ela é declarada de forma idempotente em runtime,
nos dois pontos que já a usam — `NotificationBroadcastPublisher` (a cada publish) e
`NotificationBroadcastSubscriber` (no callback `setup`, a cada conexão/reconexão) — ambos com
`durable: false` (ver D4). Como `assertExchange` é idempotente no RabbitMQ para o mesmo conjunto
de argumentos, não há necessidade de um terceiro ponto de declaração no script de deploy.

Também entram no diff (sem mudança estrutural, só na assinatura de `publish`, ver D3):
`shared/infra/queue/queue.ts` (interface `Queue`), `shared/infra/queue/rabbitmq-adapter.ts`,
`shared/infra/queue/bullmq-adapter.ts` e `shared/infra/queue/queue-memory-adapter.ts`. E, no
diff de testes: `apps/backend/test/setup-test.ts`,
`notification/infra/controller/notification-stream.controller.business-flow-test.ts` e
`notification/infra/controller/get-notifications.controller.business-flow-test.ts` — os três
fazem `rebind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)`, símbolo removido por este
refactor (ver §3 Testes).

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
  com `amqplib@2.0.1` já usado no projeto. Assim como `RabbitMQAdapter`/`RedisNotificationSubscriber`
  hoje, `NotificationBroadcastSubscriber` não tem teardown wired em `SIGTERM`/`SIGINT` — gap
  pré-existente no `main.ts` (nenhum componente do projeto fecha conexão AMQP/Redis no shutdown
  hoje), não uma regressão introduzida por este refactor, e portanto fora de escopo aqui.
  `NotificationBroadcastSubscriber.stop()` existe na implementação (fecha o `channelWrapper`)
  apenas como utilitário de teste/futura extensão — nenhum ponto do bootstrap o chama hoje; é uma
  decisão deliberada de não fazer gold-plating no wiring de shutdown, não uma lacuna a corrigir
  nesta feature.

### D3. Generalizar `RabbitMQAdapter` para aceitar tipo e durabilidade de exchange

- **Contexto:** hoje só suporta `'direct'` (hardcoded) com `durable: true` (hardcoded), usado
  pelos 7 exchanges existentes.
- **Decisão:** adicionar dois parâmetros opcionais — `type: 'direct' | 'fanout'` (default
  `'direct'`) e `durable: boolean` (default `true`) — ambos retrocompatíveis. A assinatura
  definitiva, na interface `Queue` (`shared/infra/queue/queue.ts`) e em todas as suas
  implementações, passa a ser
  `publish<TData>(exchange: string, data: TData, type: 'direct' | 'fanout' = 'direct', durable: boolean = true): Promise<void>`.
  `NotificationBroadcastPublisher` depende da interface `Queue` (injetada via
  `SHARED_TYPES.Queue`), não da classe concreta `RabbitMQAdapter` — preservando o padrão de
  injeção por abstração já usado no restante do projeto e mantendo a possibilidade de
  substituir por `QueueMemoryAdapter` em testes. `RabbitMQAdapter.publish` passa a chamar
  `assertExchange(exchange, type, { durable })`; `BullMQAdapter` e `QueueMemoryAdapter`
  aceitam os dois parâmetros novos e os ignoram (não têm o conceito de tipo de exchange).
  Nenhuma chamada existente aos 7 exchanges `direct` precisa mudar, pois ambos os defaults
  preservam o comportamento atual.
- **Justificativa técnica:** reaproveita o adapter já testado em vez de duplicar lógica de
  conexão AMQP em um componente paralelo; evita um segundo caminho de publicação bypassando o
  adapter só para a exchange fanout.
- **Justificativa de negócio:** menor superfície de código nova para revisar e manter.
- **Trade-offs aceitos:** qualquer regressão no adapter generalizado pode, em tese, afetar
  também os 7 exchanges `direct` existentes — mitigado mantendo os defaults retrocompatíveis e
  cobrindo com teste de regressão dos fluxos `direct` atuais.

### D4. Contrato único de `durable: false` para a exchange `notificationBroadcast`

- **Contexto:** a exchange `notificationBroadcast` é declarada por **dois** componentes
  independentes — `NotificationBroadcastPublisher` (via `queue.publish`, interface `Queue`
  implementada por `RabbitMQAdapter`, ver D3) e
  `NotificationBroadcastSubscriber` (via `amqp-connection-manager`, em conexão AMQP própria). O
  RabbitMQ recusa (`PRECONDITION_FAILED`, fecha o canal) uma segunda declaração da mesma
  exchange com um argumento `durable` diferente do já registrado no broker — isso é um erro de
  runtime garantido, não hipotético, caso os dois componentes usem valores diferentes.
- **Decisão:** a exchange `notificationBroadcast` usa **`durable: false`** nos dois pontos de
  declaração: `NotificationBroadcastPublisher` chama
  `queue.publish(EXCHANGES.NOTIFICATION_BROADCAST, payload, "fanout", false)` (usando o
  parâmetro `durable` de D3) e `NotificationBroadcastSubscriber` assere
  `channel.assertExchange(EXCHANGES.NOTIFICATION_BROADCAST, "fanout", { durable: false })` no
  callback `setup` do `amqp-connection-manager`.
- **Justificativa técnica:** uma exchange fanout sem fila fixa não precisa sobreviver a restart
  do broker — não há consumidor "durável" esperando por ela quando todas as instâncias estão
  fora do ar (a garantia de durabilidade do sistema já vem inteiramente da fila
  `notificationCreated`, ver D1). `durable: false` também é consistente com as filas exclusivas/
  auto-delete do subscriber, que já não sobrevivem a restart.
- **Trade-offs aceitos:** nenhum além do já coberto por D3 — os dois pontos de declaração
  precisam ser mantidos sincronizados manualmente (não há uma única fonte de verdade em código
  para o valor de `durable` desta exchange); mitigado exigindo que os testes de
  `NotificationBroadcastPublisher` e `NotificationBroadcastSubscriber` (Task 4 e Task 6)
  asseriem explicitamente `durable: false` na mesma chamada.

---

## Rollout e reversão

**Decisão explícita:** este refactor remove `RedisNotificationPublisher`/`RedisNotificationSubscriber`
por completo num único deploy, sem feature-flag e sem período de convivência entre os dois
caminhos (Redis e RabbitMQ). Não há chave de configuração para religar o caminho antigo — a única
forma de reverter, caso o `amqp-connection-manager` apresente comportamento inesperado em produção
sob carga real multi-instância (cenário não coberto pelo teste de integração da Task 9, que roda
apenas 2 subscribers locais), é reverter o deploy (revert do commit). Esta decisão é aceita
deliberadamente porque: (a) o risco de reconexão AMQP já está mitigado por D4 (gate de teste
bloqueante no `durable`) e é de score baixo (2 🟢, ver tabela abaixo); (b) a fila durável
`notificationCreated` preserva a notificação no Postgres independentemente do caminho de broadcast,
então mesmo uma falha do `NotificationBroadcastSubscriber` não perde dado, só atrasa a entrega em
tempo real. Manter os dois caminhos em paralelo por um release inteiro foi avaliado e descartado
por adicionar complexidade (dois subscribers ativos, dois pontos de configuração) sem redução de
risco proporcional, dado o placar acima.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Perda de broadcast durante janela de reconexão AMQP de uma instância | 1 | 2 | 2 🟢 | Mesma característica best-effort que o Redis Pub/Sub já tinha; não há catch-up automático via SSE (nem `Last-Event-ID` nem equivalente existe hoje) — o Postgres é a fonte da verdade e a notificação perdida fica disponível na próxima leitura via `GET /api/v1/notifications`; sem perda de dado, só atraso pontual na entrega em tempo real |
| Publisher e subscriber declaram `notificationBroadcast` com `durable` divergente → `PRECONDITION_FAILED`, canal fechado | 3 | 3 | 9 🔴 | **Gate bloqueante, não mitigação opcional** (ver D4): os dois pontos de declaração usam `durable: false`, e os testes unitários de `NotificationBroadcastPublisher` e `NotificationBroadcastSubscriber` (Task 4 e Task 6) asseriem explicitamente esse valor na chamada — é essa asserção, não o teste de integração da Task 9, que previne a divergência chegar a produção. O teste de integração da Task 9 sobe publisher e subscriber reais contra um broker real (decisão deliberada, sem broker fake — ver Task 9) e comprova o fan-out multi-instância fim a fim; ele não induz nem detecta `durable` divergente, já que os dois lados usam o mesmo valor hardcoded |
| Nova dependência `amqp-connection-manager` incompatível com `amqplib@2.0.1` | 2 | 1 | 2 🟢 | **Gate bloqueante** antes de codar: confirmar a API publicada via `context7` (tipo `ChannelWrapper`, assinatura de `createChannel({ setup })`) — não prosseguir com a implementação da Task 6 sem essa confirmação |
| Regressão no `RabbitMQAdapter` generalizado afeta os 7 exchanges `direct` existentes | 3 | 1 | 3 🟡 | Default `'direct'` retrocompatível; suíte de testes de regressão dos fluxos existentes roda antes do merge |
| Custo operacional de N filas exclusivas simultâneas (uma por instância) | 1 | 1 | 1 🟢 | Filas exclusivas não persistem mensagem em disco nem replicam entre nós; RabbitMQ suporta dezenas de milhares de filas em produção — irrelevante na escala atual (poucas instâncias) |

---

## 3. Testes

### Novos / atualizados

| Arquivo | Cobertura |
|---|---|
| `notification-broadcast-publisher.test.ts` (novo) | Publica na exchange fanout correta (`durable: false`, ver D4) com o payload esperado |
| `notification-broadcast-subscriber.test.ts` (novo) | Declara exchange (`durable: false`, mesmo valor do publisher) e fila exclusiva, consome mensagem, repassa para `SseManager.send()`; redeclaração após reconexão simulada |
| `notification-queue-worker.test.ts` (novo — não existe hoje) | Cobre o callback de `queue.consume` registrado em `init()`, verificando publish via `NotificationBroadcastPublisher` em vez de `RedisNotificationPublisher` |
| Teste de integração novo | Publish na fanout → múltiplas filas exclusivas simuladas (≥2 "instâncias") recebem o mesmo payload; decisão deliberada de usar broker real, sem broker fake, para exercitar o comportamento fim a fim (ver §Riscos) |
| `apps/backend/test/setup-test.ts` (atualizado) | Setup global de `test:business-flow`: o `container.rebind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)` (linha 28) precisa ser trocado para o novo identificador (`NotificationBroadcastSubscriber`), com stub equivalente (`subscribe`/`start` e `disconnect` mockados) — sem essa atualização o build quebra (símbolo removido) e, se corrigido pela metade, cada teste de `test:business-flow` abre uma conexão AMQP real nunca fechada |
| `notification-stream.controller.business-flow-test.ts` (atualizado) | O rebind interno de `NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber` (linha 31) muda para o novo identificador — o comportamento HTTP/SSE testado não muda, mas o símbolo rebindado sim |
| `get-notifications.controller.business-flow-test.ts` (atualizado) | Mesmo rebind de `NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber` (linha 33) precisa da mesma atualização |

### Inalterados (devem continuar passando sem modificação)

- `sse-manager.test.ts` — testa só a entrega local, não depende do transporte
- Todos os testes de use-case (`get-notifications`, `get-unread-count`, `mark-as-read`, `mark-all-as-read`) — exceto o rebind de setup listado acima
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
