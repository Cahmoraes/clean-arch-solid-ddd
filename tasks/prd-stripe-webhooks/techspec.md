# Tech Spec — Conclusão do Sistema de Webhooks do Stripe

## Resumo Executivo

A implementação completa o ciclo de vida de assinaturas integrando o processamento de webhooks do Stripe ao domínio de `subscription`. A arquitetura desacopla a validação HTTP do processamento de negócio via RabbitMQ: o `StripeWebhookController` valida a assinatura criptográfica e publica o evento na fila `stripeWebhook`; um worker dedicado (`StripeWebhookWorker`) consome mensagens e roteia para os use cases `ActivateSubscriptionUseCase`, `CancelSubscriptionUseCase` e `HandlePaymentFailedUseCase`. A idempotência é garantida via tabela Prisma `stripe_webhook_events` com constraint única no `event_id`, usando o padrão insert-first para atomicidade sem race conditions.

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Novos componentes:**

| Componente | Responsabilidade |
|---|---|
| `StripeWebhookWorker` | Consumer RabbitMQ: idempotência + roteamento de eventos |
| `ActivateSubscriptionUseCase` | Ativa assinatura e usuário quando status Stripe → `active` |
| `CancelSubscriptionUseCase` | Cancela assinatura e suspende usuário quando status → `canceled` |
| `HandlePaymentFailedUseCase` | Muda status para `past_due` e suspende usuário em falha de pagamento |
| `PrismaSubscriptionRepository` | Implementação Prisma da interface `SubscriptionRepository` |
| `PrismaStripeWebhookEventRepository` | Persiste eventos processados; detecta duplicatas via constraint única |
| `StripeWebhookEventRepository` | Interface de contrato para repositório de idempotência |

**Componentes modificados:**

| Componente | Modificação |
|---|---|
| `Subscription` (entidade) | Adicionar campo `customerId` (billing customer ID do Stripe) |
| `SubscriptionRepository` (interface) | Adicionar `ofBillingSubscriptionId` e `ofCustomerId` |
| `InMemorySubscriptionRepository` | Implementar os dois novos métodos |
| `SubscriptionGateway` (interface) | Adicionar método `createEventWebhook` ao contrato |
| `StripeWebhookController` | Implementar validação, resposta 200 imediata e publicação na fila |
| `QUEUES` (constante) | Adicionar `STRIPE_WEBHOOK: "stripeWebhook"` |
| `SUBSCRIPTION_TYPES` | Adicionar symbols para novos use cases, worker e repositório |
| `subscription-module.ts` | Registrar novos bindings no IoC |
| `SubscriptionRepositoryProvider` | Selecionar `PrismaSubscriptionRepository` em produção |
| Prisma schema | Adicionar model `StripeWebhookEvent`; adicionar `customer_id` em `Subscription` |

**Fluxo de dados:**

```
Stripe → POST /webhook/stripe
  → StripeWebhookController
    [1] valida stripe-signature (400 se inválida)
    [2] retorna 200
    [3] publica em queue.publish("stripeWebhook", payload)
        → StripeWebhookWorker (consumer)
          [4] abre unitOfWork.runTransaction(tx)
          [5]   tenta INSERT em stripe_webhook_events com tx (unique: event_id)
          [6]   conflito (UniqueConstraintViolation) → rollback implícito → ack + ignora (duplicata)
          [7]   sucesso → roteia por event.type, passando tx para o use case
                customer.subscription.updated (status: active)  → ActivateSubscriptionUseCase(input, tx)
                customer.subscription.updated (status: canceled) → CancelSubscriptionUseCase(input, tx)
                customer.subscription.deleted                    → CancelSubscriptionUseCase(input, tx)
                invoice.payment_failed                           → HandlePaymentFailedUseCase(input, tx)
                outros tipos → ignora silenciosamente
          [8]   commit → INSERT + efeitos de negócio persistidos atomicamente
          [9]   falha transiente no use case → rollback → INSERT desfeito → Stripe pode reenviar
```

---

## Design de Implementação

### Interfaces Principais

**`SubscriptionRepository` (atualizada):**

```typescript
export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>
  update(subscription: Subscription): Promise<void>
  ofId(id: string): Promise<Subscription | null>
  ofUserId(userId: string): Promise<Subscription | null>
  ofBillingSubscriptionId(billingSubscriptionId: string): Promise<Subscription | null>
  ofCustomerId(customerId: string): Promise<Subscription | null>
}
```

**`StripeWebhookEventRepository` (nova):**

```typescript
export interface StripeWebhookEventRepository {
  markAsProcessed(eventId: string, eventType: string): Promise<void>
  // lança DuplicateWebhookEventError se eventId já existir
  withTransaction<TX extends object>(tx: TX): StripeWebhookEventRepository
}
```

**`SubscriptionGateway` (atualizada):**

```typescript
export interface SubscriptionGateway {
  // ... métodos existentes ...
  createEventWebhook(rawBody: string | Buffer, signature: string): Promise<Stripe.Event>
}
```

**Assinatura dos novos use cases:**

```typescript
// Os use cases aceitam tx opcional para participar de transação externa
// controlada pelo worker — padrão consistente com CheckInUseCase
type ActivateInput  = { billingSubscriptionId: string }
type CancelInput    = { billingSubscriptionId: string }
type PaymentInput   = { customerId: string }
type Output         = Either<SubscriptionNotFoundError, void>

// Repositórios usam withTransaction(tx) quando tx é fornecido
// Quando tx é undefined, operam sem contexto de transação
async execute(input: ActivateInput, tx?: object): Promise<Output>
```

**Payload da fila RabbitMQ:**

```typescript
interface StripeWebhookQueuePayload {
  eventId: string
  eventType: string
  eventData: Stripe.Event
}
```

### Modelos de Dados

**Prisma — `Subscription` (campo novo):**

```prisma
model Subscription {
  // campos existentes...
  customer_id String  @map("customer_id")

  @@index([customer_id])
  @@map("subscriptions")
}
```

**Prisma — `StripeWebhookEvent` (novo model):**

```prisma
model StripeWebhookEvent {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  event_id     String   @unique
  event_type   String
  processed_at DateTime @default(now())

  @@map("stripe_webhook_events")
}
```

**Entidade `Subscription` (campo novo):**

```
customerId: string  — billingCustomerId do customer Stripe
```
O `Subscription.create()` e `Subscription.restore()` recebem `customerId` como parâmetro obrigatório.

### Endpoints de API

| Método | Caminho | Descrição |
|---|---|---|
| `POST` | `/webhook/stripe` | Recebe eventos do Stripe; valida assinatura; publica na fila |

Já registrado em `StripeWebhookController`. Nenhuma nova rota é necessária.

---

## Pontos de Integração

**Stripe SDK (`stripe` npm package):**
- `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` — usado no gateway existente `StripeSubscriptionGateway.createEventWebhook()`
- Falha de verificação lança `Stripe.errors.StripeSignatureVerificationError`; o controller captura e responde 400

**RabbitMQ via `Queue` interface:**
- Exchange/queue: `stripeWebhook` (adicionar a `QUEUES`)
- Publicação no controller: `queue.publish(QUEUES.STRIPE_WEBHOOK, payload)`
- Consumo no worker: `queue.consume(QUEUES.STRIPE_WEBHOOK, handler)`
- Em caso de exceção no handler, o worker deve fazer ack da mensagem para evitar reprocessamento infinito (tolerância a falhas conforme PRD)

**Prisma (idempotência):**
- `stripe_webhook_events.event_id` com constraint `UNIQUE`
- A tentativa de INSERT com `event_id` duplicado lança erro de violação de constraint; o worker captura e ignora silenciosamente

---

## Abordagem de Testes

### Testes Unidade

**Cenários críticos por use case:**

| Use Case | Cenários |
|---|---|
| `ActivateSubscriptionUseCase` | assinatura encontrada → ativa subscription + ativa user; assinatura não encontrada → failure(SubscriptionNotFoundError) |
| `CancelSubscriptionUseCase` | assinatura encontrada → cancela subscription + suspende user; not found → failure |
| `HandlePaymentFailedUseCase` | assinatura encontrada → status past_due + suspende user; not found → failure |

**Mocks necessários:** `InMemorySubscriptionRepository`, `InMemoryUserRepository` — sem mocks de frameworks.

**Cenários do worker (`StripeWebhookWorker`):**
- Evento `customer.subscription.updated` status `active` → chama `ActivateSubscriptionUseCase`
- Evento `customer.subscription.deleted` → chama `CancelSubscriptionUseCase`
- Evento `invoice.payment_failed` → chama `HandlePaymentFailedUseCase`
- Evento de tipo não mapeado → nenhum use case é chamado
- Evento com `eventId` já presente no repositório de idempotência → use case NÃO é chamado

### Testes de Integração

**`StripeWebhookController` (business-flow):**
- Requisição sem `stripe-signature` → 400
- Requisição com assinatura inválida → 400
- Requisição com assinatura válida → 200 (independente do processamento async)

Usar `stripe.webhooks.generateTestHeaderString()` para gerar assinaturas válidas em testes.

**`PrismaSubscriptionRepository`:**
- `ofBillingSubscriptionId` localiza pelo ID correto
- `ofCustomerId` localiza pelo customerId correto

### Testes de E2E

Não aplicável — funcionalidade é backend-only sem frontend.

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Prisma schema** — adicionar `customer_id` em `Subscription` e model `StripeWebhookEvent`; gerar migration e cliente
2. **Entidade `Subscription`** — adicionar campo `customerId`; atualizar `create()` e `restore()`
3. **Interfaces** — atualizar `SubscriptionRepository` (2 novos métodos), `SubscriptionGateway` (`createEventWebhook`); criar `StripeWebhookEventRepository`
4. **`InMemorySubscriptionRepository`** — implementar `ofBillingSubscriptionId` e `ofCustomerId`
5. **`PrismaSubscriptionRepository`** — implementar interface completa (todos os métodos)
6. **`PrismaStripeWebhookEventRepository`** — implementar `markAsProcessed` com captura de unique violation
7. **Erros de domínio** — criar `SubscriptionNotFoundError` em `subscription/application/error/`
8. **Use cases** — `ActivateSubscriptionUseCase`, `CancelSubscriptionUseCase`, `HandlePaymentFailedUseCase`
9. **`StripeWebhookWorker`** — consumer que orquestra idempotência + roteamento
10. **`StripeWebhookController`** — completar com publicação na fila e tratamento de erros de assinatura
11. **IoC** — atualizar `SUBSCRIPTION_TYPES`, `subscription-module.ts`, `SubscriptionRepositoryProvider`, `QUEUES`
12. **Testes unidade** dos use cases e worker
13. **Testes business-flow** do controller

### Dependências Técnicas

- Migration Prisma executada antes de qualquer teste de integração
- Fila `stripeWebhook` deve existir no RabbitMQ antes do worker iniciar (configurar em `queue-setup.ts`)
- `STRIPE_WEBHOOK_SECRET` obrigatório em ambiente de produção (já validado no `envSchema`)

---

## Monitoramento e Observabilidade

- **Logs de erro** no worker: evento de tipo não tratado (nível `warn`); falha no use case (nível `error` com `eventId` e `eventType`)
- **Log de duplicata**: `info` ao detectar `eventId` já processado — rastreabilidade de audit conforme PRD
- **Log de sucesso**: `info` ao completar processamento com `eventId`, `eventType` e resultado do use case
- O decorator `@Logger` existente pode ser aplicado nos métodos `init()` do worker e dos use cases para padronização

---

## Considerações Técnicas

### Decisões Principais

**RabbitMQ para desacoplamento async:**
O controller retorna 200 imediatamente após publicar na fila — sem bloquear em lógica de negócio. Alternativa rejeitada: `Promise` sem `await` no controller (fire-and-forget) é frágil — falhas silenciosas sem visibilidade de retry.

**Insert-first para idempotência:**
A tentativa de INSERT com unique constraint é atômica ao nível do banco, eliminando race conditions entre múltiplas instâncias do worker. Alternativa rejeitada: SELECT-then-INSERT tem janela de race condition entre as duas operações.

**Transação atômica no worker (INSERT + efeitos de negócio):**
O worker controla a transação via `unitOfWork.runTransaction(tx)` e passa o contexto `tx` para o `markAsProcessed` e para os use cases. Isso garante que o INSERT de idempotência e os efeitos de negócio são commitados juntos ou revertidos juntos. Sem essa garantia, uma falha transiente após o INSERT — mas antes do commit do use case — marcaria o evento como processado sem aplicar o efeito, perdendo-o permanentemente. Com a transação compartilhada, o rollback desfaz o INSERT e o Stripe pode reenviar sem conflito. Use cases expõem `execute(input, tx?: object)` e usam `repository.withTransaction(tx)` quando `tx` é fornecido — padrão já estabelecido em `CheckInUseCase`.

**`customerId` direto na `Subscription`:**
Evita dois saltos de repositório para `invoice.payment_failed` (User → Subscription). O `customerId` já está disponível no momento de criação da assinatura via `CreateSubscriptionUseCase`.

**Either para use cases novos:**
Consistente com o padrão do projeto. O worker captura `failure(SubscriptionNotFoundError)` e loga sem propagar exceção ao broker (tolerância a falhas requerida pelo PRD).

**`StripeWebhookController` permanece no `infra/controller/`:**
O arquivo vazio em `infra/webhook/` deve ser removido para evitar ambiguidade. Toda a lógica HTTP reside em `infra/controller/stripe-webhook.controller.ts`.

### Riscos Conhecidos

- **Ordem dos eventos**: o Stripe não garante entrega em ordem. Use cases devem ser idempotentes — chamar `subscription.activate()` em uma assinatura já ativa não causa erro.
- **Worker offline durante pico**: mensagens acumulam na fila RabbitMQ. O insert-first garante que ao retomar, duplicatas são ignoradas.
- **`customer_id` nulo em assinaturas existentes**: a migration deve definir estratégia de backfill ou tornar o campo nullable para compatibilidade retroativa.

### Conformidade com Skills Padrões

- **`tdd`**: aplicável a toda implementação desta feature — usar ciclo red-green-refactor por vertical slice: um teste por comportamento antes de escrever a implementação; começar pelo use case mais simples (`ActivateSubscriptionUseCase`) como tracer bullet
- **`no-workarounds`**: aplicável ao corrigir o `StripeWebhookController` atual (não utilizar `console.log` ou `return` sem processamento como solução final)
- **`test-antipatterns`**: aplicável ao escrever testes dos use cases (evitar mock de repositórios in-memory, usar implementações reais)
- **`systematic-debugging`**: aplicável se houver falhas de integração com RabbitMQ ou Prisma durante implementação

### Arquivos relevantes e dependentes

**Novos:**
- `src/subscription/application/use-case/activate-subscription.usecase.ts`
- `src/subscription/application/use-case/cancel-subscription.usecase.ts`
- `src/subscription/application/use-case/handle-payment-failed.usecase.ts`
- `src/subscription/application/error/subscription-not-found-error.ts`
- `src/subscription/repository/stripe-webhook-event-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository.ts`
- `src/subscription/infra/worker/stripe-webhook-worker.ts`

**Modificados:**
- `src/subscription/domain/subscription.ts`
- `src/subscription/repository/subscription-repository.ts`
- `src/subscription/gateway/subscription-gateway.ts`
- `src/subscription/infra/controller/stripe-webhook.controller.ts`
- `src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts`
- `src/shared/infra/gateway/testing-subscription-gateway.ts`
- `src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- `src/shared/infra/ioc/module/subscription/subscription-module.ts`
- `src/shared/infra/ioc/module/subscription/subscription-repository-provider.ts`
- `src/shared/infra/queue/queues.ts`
- `prisma/schema.prisma`
- `src/subscription/AGENTS.md`
