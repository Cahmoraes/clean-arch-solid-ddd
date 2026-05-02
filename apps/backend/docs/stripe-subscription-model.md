# Modelo de Subscriptions do Stripe — Análise e Avaliação da Implementação Atual

## Executive Summary

O modelo de assinaturas do Stripe gira em torno de quatro objetos centrais: **Customer**, **PaymentMethod**, **Price/Product** e **Subscription**. O fluxo é: criar um customer, anexar um método de pagamento, criar a assinatura referenciando um Price (plano), e então reagir a eventos de webhook para sincronizar o estado localmente. A implementação existente em `src/subscription/` está **no caminho certo**: a estrutura de Gateway, os status mapeados, a entidade `Subscription`, e a separação entre criação de customer e criação de assinatura estão alinhados ao modelo canônico do Stripe. Foram identificados, porém, **lacunas críticas** que precisam ser endereçadas antes de considerar a implementação completa: o webhook não processa nenhum evento concreto, os use cases `ActivateSubscription` e `CancelSubscription` existem nos types mas não foram implementados, e o fluxo de `createPaymentMethod()` usa token de teste hard-coded (`tok_visa`), inadequado para produção.

---

## Como funciona o modelo de Subscriptions do Stripe

### Objetos centrais

```
┌───────────────┐       ┌──────────────────┐
│   Customer    │───────│  PaymentMethod   │
│  (cus_xxx)    │       │  (pm_xxx)        │
└───────┬───────┘       └────────┬─────────┘
        │                        │ attached
        │                        ▼
        │              ┌──────────────────┐
        └─────────────▶│  Subscription    │
                       │  (sub_xxx)       │
                       │  items: [Price]  │
                       └────────┬─────────┘
                                │ gera
                                ▼
                       ┌──────────────────┐
                       │    Invoice       │
                       │  (in_xxx)        │
                       └────────┬─────────┘
                                │ cobra via
                                ▼
                       ┌──────────────────┐
                       │  PaymentIntent   │
                       │  (pi_xxx)        │
                       └──────────────────┘
```

### Ciclo de vida completo

**1. Criar o Customer**
O Customer representa seu usuário no Stripe. Deve ser criado uma única vez por usuário e seu ID (`cus_xxx`) armazenado localmente.

```typescript
stripe.customers.create({ email, name, metadata: { userId } })
```

**2. Coletar e anexar PaymentMethod**
O frontend usa Stripe.js / Elements para tokenizar o cartão e retornar um `pm_xxx`. No backend, esse ID é anexado ao customer e definido como padrão:

```typescript
stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
stripe.customers.update(customerId, {
  invoice_settings: { default_payment_method: paymentMethodId }
})
```

**3. Criar a Subscription**
A assinatura referencia o customer e um ou mais `price_xxx` (planos definidos no dashboard):

```typescript
stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete', // ou 'error_if_incomplete'
  expand: ['latest_invoice.payment_intent'],
})
```

**4. Status da Subscription**

| Status               | Significado                                                                            |
|----------------------|----------------------------------------------------------------------------------------|
| `trialing`           | Em período de teste gratuito                                                           |
| `active`             | Ativa e em bom estado                                                                  |
| `incomplete`         | Aguardando pagamento (até 23h) ou 3DS necessário                                       |
| `incomplete_expired` | Pagamento inicial não realizado em 23h — estado terminal sem cobranças futuras         |
| `past_due`           | Última fatura finalizada não paga; Stripe fará Smart Retries                           |
| `canceled`           | Cancelada — estado terminal, não pode ser reativada                                    |
| `unpaid`             | Fatura não paga, assinatura ainda ativa, novas tentativas suspensas                    |
| `paused`             | Trial encerrado sem método de pagamento; faturas suspensas até retomada                |

**5. Webhooks — sincronização assíncrona**
O Stripe envia eventos para seu endpoint. Os mais críticos para assinaturas:

| Evento                              | Ação recomendada                                              |
|-------------------------------------|---------------------------------------------------------------|
| `customer.subscription.created`     | Registrar assinatura localmente                               |
| `customer.subscription.updated`     | Atualizar status localmente                                   |
| `customer.subscription.deleted`     | Marcar como `canceled` localmente                             |
| `invoice.paid`                      | Confirmar acesso ao produto / marcar `active`                 |
| `invoice.payment_failed`            | Notificar usuário; aguardar Smart Retry                       |
| `invoice.payment_action_required`   | Redirecionar usuário para autenticar (3DS)                    |
| `customer.subscription.trial_will_end` | Notificar 3 dias antes do fim do trial                     |
| `customer.subscription.paused`      | Suspender acesso ao produto                                   |

---

## Análise da Implementação Existente

### O que está correto

#### Entidade `Subscription`
**Arquivo**: `src/subscription/domain/subscription.ts`

A entidade modela corretamente os campos essenciais:
- `billingSubscriptionId` — ID do Stripe (`sub_xxx`)
- `userId` — relacionamento com o usuário local
- `status` — mapeado para todos os status reais do Stripe[^1]
- `canceledAt` / `updatedAt` — rastreamento de ciclo de vida[^2]
- Métodos `activate()`, `cancel()`, `changeStatus()` para transições de estado[^3]

#### Status mapeados corretamente
**Arquivo**: `src/subscription/domain/subscription-status-types.ts`

```typescript
export const SubscriptionStatusTypes = {
  active: "active",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  past_due: "past_due",
  trialing: "trialing",
  unpaid: "unpaid",
  paused: "paused",
} as const
```

Cobre todos os 8 status da API do Stripe.[^4] O schema Prisma, porém, lista apenas 7 (falta `paused`) — inconsistência a corrigir.[^5]

#### Interface `SubscriptionGateway`
**Arquivo**: `src/subscription/gateway/subscription-gateway.ts`

A interface isola o domínio do SDK do Stripe de forma adequada. As operações `createCustomer`, `attachPaymentMethodToCustomer`, `createSubscription` e `createPaymentMethod` cobrem o fluxo básico.[^6]

#### `StripeSubscriptionGateway` — implementação concreta
**Arquivo**: `src/shared/infra/gateway/stripe-subscription-gateway.ts`

Pontos positivos:
- `maxNetworkRetries: 3` — resiliência automática a falhas de rede[^7]
- `timeout: 10000` — timeout explícito de 10s[^7]
- `save_default_payment_method: "on_subscription"` — salva PM automaticamente[^7]
- `payment_behavior: "error_if_incomplete"` — falha explícita se pagamento não concluído[^7]
- Separação `buildSubscriptionParams()` — encapsula complexidade dos params[^7]
- `createEventWebhook` com `stripe.webhooks.constructEvent` — verifica assinatura criptográfica[^7]

#### Fluxo de criação de customer acionado por evento de domínio
**Arquivo**: `src/subscription/infra/controller/create-customer-controller.ts`

O `CreateCustomerController` subscreve ao evento `userCreated` e cria automaticamente um customer no Stripe. Isso é elegante: desacopla o módulo `user` do módulo `subscription`.[^8]

#### Armazenamento de `billingCustomerId` no `User`
**Arquivo**: `src/user/domain/user.ts`

O campo `billingCustomerId` é armazenado na entidade `User` com método `assignBillingCustomerId()` que publica o evento `UserAssignedBillingCustomerIdEvent`.[^9] A propriedade está no schema Prisma como `billing_customer_id String? @unique`.[^10]

#### `TestingSubscriptionGateway` para testes
**Arquivo**: `src/shared/infra/gateway/testing-subscription-gateway.ts`

Implementação in-memory do gateway para testes unitários, sem chamadas reais à API do Stripe.[^11]

---

### Lacunas e problemas identificados

#### 1. Webhook não processa eventos concretos (critico)
**Arquivo**: `src/subscription/infra/controller/stripe-webhook.controller.ts`

O handler atual apenas valida a assinatura e loga o evento, mas **não executa nenhuma ação**:

```typescript
const event = await this.subscriptionGateway.createEventWebhook(req.rawBody, signature)
console.log({ event })
return { body: req.rawBody, status: 200 } // nada mais acontece
```

Isso significa que quando o Stripe enviar `customer.subscription.updated`, `invoice.paid`, ou `customer.subscription.deleted`, o status local **nunca será atualizado**.[^12]

**O que deve ser implementado:**

```typescript
private async handler(req: FastifyRequest): Promise<HandleCallbackResponse> {
  const signature = this.signatureFromHeaders(req.headers)
  if (!signature || !req.rawBody) return { body: null, status: 400 }

  const event = await this.subscriptionGateway.createEventWebhook(req.rawBody, signature)

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await this.updateSubscriptionUseCase.execute({
        billingSubscriptionId: sub.id,
        status: sub.status,
      })
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      await this.activateSubscriptionUseCase.execute({
        billingSubscriptionId: invoice.subscription as string,
      })
      break
    }
    case 'invoice.payment_failed': {
      // notificar usuário
      break
    }
  }

  return { body: null, status: 200 }
}
```

#### 2. Use Cases `ActivateSubscription` e `CancelSubscription` não implementados
**Arquivo**: `src/shared/infra/ioc/module/service-identifier/subscription-types.ts`

Os symbols `ActivateSubscription` e `CancelSubscription` estão definidos nos SUBSCRIPTION_TYPES[^13], mas os arquivos `.usecase.ts` correspondentes **não existem**. Sem eles, o webhook não pode atualizar o estado das assinaturas.

#### 3. `createPaymentMethod()` usa token de teste hard-coded
**Arquivo**: `src/shared/infra/gateway/stripe-subscription-gateway.ts` (linha 88-95)

```typescript
public async createPaymentMethod(): Promise<string> {
  const paymentMethod = await this.stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" }, // ← token de teste, apenas funciona em modo test
  })
  return paymentMethod.id
}
```

Isso é adequado para desenvolvimento/testes, mas **não pode ir para produção**. Em produção, o `paymentMethodId` deve vir do frontend (via Stripe.js / Elements), não ser gerado pelo backend.[^7]

**Fluxo correto para produção:**
```
Frontend → stripe.createPaymentMethod() → pm_xxx → Backend → attachPaymentMethodToCustomer()
```

O input `CreateSubscriptionUseCaseInput` já aceita `paymentMethodId`[^14], então a correção é remover o `createPaymentMethod()` da cadeia e exigir que o frontend envie o `pm_xxx`.

#### 4. Entidade `Subscription` não extende `Observable`
**Arquivo**: `src/subscription/domain/subscription.ts`

Diferente de `User` e outras entidades, `Subscription` não extende `Observable` e portanto não pode publicar eventos de domínio via `this.notify()`. O evento `subscription-activated-event.ts` existe mas está vazio.[^15] Para integrar com `DomainEventPublisher`, a entidade deve extender `Observable`.

#### 5. `create()` não usa o padrão `Either`
**Arquivo**: `src/subscription/domain/subscription.ts`

O método `create()` retorna `Subscription` diretamente (sem `Either`), e `CreateSubscriptionUseCase.execute()` retorna `Promise<void>` sem tratamento de erros.[^16] Isso diverge do padrão estabelecido nos demais módulos (`user`, `check-in`, `gym`).

**Recomendação**: Manter o padrão — falhas do gateway são excepcionais e justificam não usar `Either`. Porém, adicionar retorno tipado (ex: `Promise<{ subscriptionId: string }>`) ao use case para que o controller possa retornar informações úteis ao cliente.

#### 6. `id` e `billingSubscriptionId` são o mesmo valor
**Arquivo**: `src/subscription/application/use-case/create-subscription.usecase.ts` (linha 35-40)

```typescript
const subscription = Subscription.create({
  status: subscriptionResponse.status,
  userId: input.userId,
  billingSubscriptionId: subscriptionResponse.subscriptionId,
  id: subscriptionResponse.subscriptionId, // ← mesmo valor duplicado
})
```

Se o `id` interno da entidade for o mesmo que o `billingSubscriptionId`, não há necessidade de dois campos. Considere usar um UUID interno separado para `id` e reservar `billingSubscriptionId` exclusivamente para o ID do Stripe.[^16]

#### 7. `console.log` em código de produção
**Arquivos**: `create-customer.usecase.ts` (linhas 54-57), `create-subscription.usecase.ts` (linha 43)

Logs de debug foram deixados nos use cases. Devem ser substituídos pelo mecanismo de logging estruturado do projeto (decorador `@Logger`) ou removidos.

#### 8. Schema Prisma ausente: status `paused`
**Arquivo**: `prisma/schema.prisma`

O enum `SubscriptionStatus` no Prisma não inclui `paused`[^5], mas o TypeScript types incluem. Isso causará erro de tipo ao tentar persistir uma subscription com status `paused`.

---

## Fluxo completo recomendado para produção

```
[Frontend]                    [Backend]                        [Stripe]
    │                             │                                │
    │── POST /users ──────────────▶                                │
    │                        cria User                            │
    │                        publica UserCreatedEvent             │
    │                             │                                │
    │                        CreateCustomerController             │
    │                        subscreve UserCreatedEvent           │
    │                             │── stripe.customers.create ───▶│
    │                             │◀── { id: cus_xxx } ──────────│
    │                        salva billingCustomerId no User       │
    │                             │                                │
    │                             │                                │
    │── stripe.createPaymentMethod()──────────────────────────────▶│
    │◀── pm_xxx ──────────────────────────────────────────────────│
    │                             │                                │
    │── POST /subscriptions ──────▶                                │
    │   { customerId, priceId,    │                                │
    │     paymentMethodId }       │                                │
    │                             │── attachPaymentMethod ────────▶│
    │                             │── createSubscription ─────────▶│
    │                             │◀── { sub_xxx, status } ───────│
    │                        salva Subscription local              │
    │◀── 201 Created ─────────────│                                │
    │                             │                                │
    │                             │◀── webhook: invoice.paid ─────│
    │                             │    → ActivateSubscriptionUseCase│
    │                             │    → subscription.activate()   │
    │                             │    → repository.update()       │
    │                             │── 200 OK ─────────────────────▶│
    │                             │                                │
    │                             │◀── webhook: sub.updated ───────│
    │                             │    → UpdateSubscriptionUseCase  │
    │                             │    → changeStatus(newStatus)   │
    │                             │── 200 OK ─────────────────────▶│
```

---

## Use Cases a implementar

### `ActivateSubscriptionUseCase`

```typescript
// src/subscription/application/use-case/activate-subscription.usecase.ts
@injectable()
export class ActivateSubscriptionUseCase {
  constructor(
    @inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  public async execute(input: { billingSubscriptionId: string }): Promise<void> {
    const subscription = await this.subscriptionRepository.ofId(input.billingSubscriptionId)
    if (!subscription) return
    subscription.activate()
    await this.subscriptionRepository.update(subscription)
  }
}
```

### `CancelSubscriptionUseCase`

```typescript
// src/subscription/application/use-case/cancel-subscription.usecase.ts
@injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  public async execute(input: { billingSubscriptionId: string }): Promise<void> {
    const subscription = await this.subscriptionRepository.ofId(input.billingSubscriptionId)
    if (!subscription) return
    subscription.cancel()
    await this.subscriptionRepository.update(subscription)
  }
}
```

### `UpdateSubscriptionStatusUseCase` (necessário para webhook genérico)

```typescript
// src/subscription/application/use-case/update-subscription-status.usecase.ts
@injectable()
export class UpdateSubscriptionStatusUseCase {
  constructor(
    @inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  public async execute(input: {
    billingSubscriptionId: string
    status: SubscriptionStatusTypes
  }): Promise<void> {
    const subscription = await this.subscriptionRepository.ofId(input.billingSubscriptionId)
    if (!subscription) return
    subscription.changeStatus(input.status)
    await this.subscriptionRepository.update(subscription)
  }
}
```

---

## Checklist de completude

| Item                                                                   | Status     |
|------------------------------------------------------------------------|------------|
| Entidade `Subscription` com status completos                           | ✅ OK       |
| Gateway interface `SubscriptionGateway`                                | ✅ OK       |
| Implementação `StripeSubscriptionGateway` com retry/timeout            | ✅ OK       |
| `TestingSubscriptionGateway` para testes                               | ✅ OK       |
| `InMemorySubscriptionRepository`                                       | ✅ OK       |
| Schema Prisma para `Subscription`                                      | ✅ OK       |
| Criação de customer via evento de domínio `userCreated`                | ✅ OK       |
| `billingCustomerId` no `User`                                          | ✅ OK       |
| Verificação de assinatura criptográfica no webhook                     | ✅ OK       |
| Processamento de eventos do webhook                                    | ❌ Ausente  |
| `ActivateSubscriptionUseCase`                                          | ❌ Ausente  |
| `CancelSubscriptionUseCase`                                            | ❌ Ausente  |
| `UpdateSubscriptionStatusUseCase`                                      | ❌ Ausente  |
| `createPaymentMethod()` removido do backend (deve vir do frontend)     | ❌ Ausente  |
| `Subscription` extendendo `Observable`                                 | ❌ Ausente  |
| Evento `SubscriptionActivatedEvent` implementado                       | ❌ Vazio    |
| Status `paused` no enum Prisma                                         | ❌ Ausente  |
| `console.log` removidos dos use cases                                  | ❌ Pendente |
| `id` separado do `billingSubscriptionId`                               | ⚠️ Duplicado|

---

## Confidence Assessment

**Alta confiança:**
- Análise dos arquivos de código fonte — lidos diretamente do repositório
- Mapeamento de status — confirmado contra documentação oficial do Stripe e código local
- Lacunas identificadas — baseadas em análise direta do código

**Confiança média:**
- Recomendações de fluxo de produção — baseadas na documentação oficial do Stripe e boas práticas, mas o contexto de negócio exato pode influenciar escolhas (ex: usar Checkout vs. Elements vs. API direta)

**Inferência:**
- O campo `paused` ausente no schema Prisma pode ser intencional (caso o produto não suporte trial gratuito sem cartão), mas foi listado como lacuna pelo padrão de completude

---

## Footnotes

[^1]: `src/subscription/domain/subscription.ts:71-84` — métodos `activate()`, `cancel()`, `changeStatus()`
[^2]: `src/subscription/domain/subscription.ts:24-26` — campos `_updatedAt` e `_canceledAt`
[^3]: `src/subscription/domain/subscription.ts:71-84` — mutações de estado
[^4]: `src/subscription/domain/subscription-status-types.ts:1-13` — enum de status alinhado à API do Stripe
[^5]: `prisma/schema.prisma` — enum `SubscriptionStatus` lista 7 valores; falta `paused`
[^6]: `src/subscription/gateway/subscription-gateway.ts:36-43` — interface `SubscriptionGateway`
[^7]: `src/shared/infra/gateway/stripe-subscription-gateway.ts:16-108` — implementação concreta do gateway
[^8]: `src/subscription/infra/controller/create-customer-controller.ts:10-28` — subscriber de evento de domínio
[^9]: `src/user/domain/user.ts:188-196` — método `assignBillingCustomerId`
[^10]: `prisma/schema.prisma` — campo `billing_customer_id String? @unique` no model `User`
[^11]: `src/shared/infra/gateway/testing-subscription-gateway.ts:16-85` — gateway fake para testes
[^12]: `src/subscription/infra/controller/stripe-webhook.controller.ts:38-55` — handler incompleto
[^13]: `src/shared/infra/ioc/module/service-identifier/subscription-types.ts:6-9` — symbols de use cases não implementados
[^14]: `src/subscription/application/use-case/create-subscription.usecase.ts:9-12` — interface de input
[^15]: `src/subscription/domain/event/subscription-activated-event.ts` — arquivo vazio
[^16]: `src/subscription/application/use-case/create-subscription.usecase.ts:35-41` — id duplicado e ausência de retorno tipado
