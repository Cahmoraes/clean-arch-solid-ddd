# PLANO\_DE\_ACAO.md

> Plano técnico para implementação do domínio de assinaturas com Stripe em uma aplicação DDD com Clean Architecture. Este plano será seguido por um humano ou assistente de IA (ex: GitHub Copilot) para estruturar a lógica de billing com base em Stripe, Prisma e práticas modernas de arquitetura.

---

## Contexto do Projeto

- Domínio: academias
- Entidades principais: `User`, `Gym`, `CheckIn`, `Subscription`
- ORM: Prisma + PostgreSQL
- Billing externo: Stripe
- Arquitetura: Clean Architecture + DDD
- Projeto backend em TypeScript

---

## Etapa 1 – Domínio e Modelagem

### Criar entidade `Subscription` como Agregado

**Justificativa**:\
O sistema precisa refletir o estado da assinatura do usuário de forma persistente e controlada dentro do seu core domain. Isso permite rastrear status, datas e controlar o acesso localmente (sem depender da Stripe em tempo real).

**Linha de raciocínio**:\
A assinatura é um `AggregateRoot`, pois encapsula o ciclo de vida completo de um contrato de cobrança.

**Principais tarefas**:

- Criar entidade `Subscription` com:
  - `id`, `userId`, `billingSubscriptionId`, `status`, `createdAt`, `canceledAt`
- Adicionar métodos:
  - `activate()`, `cancel()`, `markPastDue()`, `isActive()`

**Exemplo de interface**:

```ts
interface SubscriptionProps {
  billingSubscriptionId: string
  userId: string
  status: SubscriptionStatus
  createdAt: Date
  canceledAt?: Date
}

class Subscription extends AggregateRoot<SubscriptionProps> {
  activate(): void { this.props.status = 'ACTIVE' }
  cancel(): void { this.props.status = 'CANCELED'; this.props.canceledAt = new Date() }
}
```

---

### Atualizar entidade `User` com métodos para billing

**Justificativa**:\
Precisamos controlar se um usuário já está associado a um `Customer` do Stripe. Esse relacionamento deve ser opcional e encapsulado.

**Linha de raciocínio**:\
Evita criar múltiplos clientes no Stripe e mantém o domínio agnóstico do provedor externo.

**Principais tarefas**:

- Adicionar `billingCustomerId?: string` à entidade
- Criar métodos:
  - `setBillingCustomerId(id: string)`
  - `getBillingCustomerId()`
  - `hasBillingCustomer()`

**Exemplo de interface**:

```ts
class User {
  setBillingCustomerId(id: string): void {
    this.props.billingCustomerId = id
  }
  hasBillingCustomer(): boolean {
    return !!this.props.billingCustomerId
  }
}
```

---

## Etapa 2 – Casos de Uso

### Criar `CreateSubscriptionUseCase`

**Justificativa**:\
Esse caso de uso orquestra a criação de uma assinatura: criação do cliente no Stripe, definição do método de pagamento e início da assinatura.

**Linha de raciocínio**:\
Mantemos a lógica orquestrada na aplicação e delegamos integração externa para gateways, promovendo testabilidade.

**Principais tarefas**:

- Verificar se `User` tem `billingCustomerId`
- Criar cliente no Stripe se necessário
- Associar `PaymentMethod` ao cliente
- Criar assinatura via Stripe
- Persistir:
  - `billingCustomerId` no `User`
  - nova `Subscription`

**Exemplo de interface de entrada**:

```ts
interface CreateSubscriptionInput {
  userId: string
  priceId: string
  paymentMethodId: string
}
```

---

### Criar `SyncSubscriptionStatusUseCase` (Webhooks)

**Justificativa**:\
O Stripe muda o status de uma assinatura ao longo do tempo. Precisamos refletir essas mudanças em nosso domínio para controle de acesso, relatórios, etc.

**Linha de raciocínio**:\
Webhooks são a única forma confiável de sincronizar o estado real da fatura com o domínio local.

**Principais tarefas**:

- Receber evento (`invoice.payment_succeeded`, `customer.subscription.deleted`, etc.)
- Buscar assinatura por `billingSubscriptionId`
- Aplicar método: `activate()`, `cancel()`, `markPastDue()`
- Persistir mudanças

**Exemplo de evento de entrada**:

```json
{
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "subscription": "sub_123456"
    }
  }
}
```

---

## Etapa 3 – Infraestrutura (Gateways e Persistência)

### Criar `StripeSubscriptionGateway`

**Justificativa**:\
Encapsular o SDK do Stripe para manter a lógica externa isolada da aplicação.

**Linha de raciocínio**:\
Respeita Clean Architecture ao isolar efeitos colaterais em camadas externas.

**Principais tarefas**:

- `createCustomer({ name, email })`
- `attachPaymentMethod({ customerId, paymentMethodId })`
- `createSubscription({ customerId, priceId, paymentMethodId })`

**Interface esperada**:

```ts
interface StripeSubscriptionGateway {
  createCustomer(input): Promise<{ id: string }>
  attachPaymentMethod(input): Promise<void>
  createSubscription(input): Promise<{ subscriptionId: string; status: string }>
}
```

---

### Criar `SubscriptionRepository` com Prisma

**Justificativa**:\
Persistir o agregado `Subscription` e suas transições de status.

**Linha de raciocínio**:\
O domínio não conhece o ORM. O repositório converte `Aggregate → Prisma → DB`.

**Principais tarefas**:

- `save(subscription: Subscription)`
- `findByBillingSubscriptionId(id: string)`

**Exemplo de interface**:

```ts
interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>
  findByBillingSubscriptionId(id: string): Promise<Subscription | null>
}
```

---

### Atualizar `UserRepository` para billing

**Justificativa**:\
Após a criação do Customer, é necessário atualizar o `User` com o `billingCustomerId`.

**Principais tarefas**:

- `updateBillingCustomerId(userId, billingCustomerId)`

---

## Etapa 4 – Interface HTTP

### Criar endpoint `POST /subscriptions`

**Justificativa**:\
Expor a criação de assinatura ao frontend (via Elements, Checkout ou Link).

**Linha de raciocínio**:\
A API orquestra o caso de uso, não implementa lógica de billing.

**Request esperado**:

```json
{
  "userId": "uuid",
  "priceId": "price_123",
  "paymentMethodId": "pm_456"
}
```

---

### Criar endpoint `POST /stripe/webhook`

**Justificativa**:\
Processar eventos Stripe assíncronos (faturas pagas, falhas, cancelamentos).

**Linha de raciocínio**:\
Desacopla eventos do fluxo síncrono de criação. Utiliza assinatura para validar a origem segura do evento.

**Principais tarefas**:

- Criar o controller `StripeWebhookController` seguindo o padrão de injeção do projeto
- Usar `rawBody` do Fastify para validação da assinatura Stripe
- Validar assinatura com header `stripe-signature`
- Encaminhar o corpo validado para `SyncSubscriptionStatusUseCase`

**Exemplo de controller**:

```ts
await this.httpServer.register('post', '/stripe/webhook', {
  raw: true, // necessário para o Stripe
  callback: this.callback,
})

private async callback(request: FastifyRequest, reply: FastifyReply) {
  const stripeSignature = request.headers['stripe-signature']
  const rawBody = request.rawBody
  const result = await this.syncSubscriptionStatus.execute({
    rawBody,
    signature: stripeSignature,
  })
  return reply.code(200).send({ received: true })
}
```

**Observações importantes**:

- O `rawBody` precisa estar disponível no `FastifyRequest`. Para isso, configure seu servidor para capturar o corpo bruto (ex: com `fastify-raw-body`).
- A validação de assinatura deve ser feita com:

```ts
stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
```

- O `SyncSubscriptionStatusUseCase` deve extrair o tipo do evento (`event.type`) e redirecionar para o método correspondente do agregado (`activate()`, `cancel()`, etc).
- Eventos esperados:
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

---

## Etapa 5 – Testes e Diagnóstico

### Criar testes para `CreateSubscriptionUseCase`

**Justificativa**:\
Validar orquestração, falhas e persistência.

---

### Criar testes para `SyncSubscriptionStatusUseCase`

**Justificativa**:\
Verificar status e transições corretas via webhook.

---

### Adicionar logs estruturados

**Justificativa**:\
Melhorar diagnósticos em produção.

---

## Considerações Finais

- Campos como `billing_customer_id` e `billing_subscription_id` são **semânticos** e não acoplam diretamente ao Stripe.
- A estrutura proposta permite a troca futura do provedor de billing com mínimo impacto no core domain.
- Os handlers HTTP são orquestradores, não responsáveis pela lógica de negócios.

