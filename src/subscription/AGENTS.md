# Módulo Subscription

Bounded context responsável pelo gerenciamento de assinaturas de usuários integrado ao Stripe: criação de clientes de cobrança, assinaturas e processamento de webhooks.

## Estrutura

```
subscription/
├── domain/
│   ├── subscription.ts               # Entidade Subscription
│   ├── subscription-status-types.ts  # Tipos de status da assinatura
│   └── value-object/
│       └── subscription-status.ts    # Value Object de status
├── application/
│   └── use-case/
│       ├── create-customer.usecase.ts       # Criar cliente no Stripe
│       └── create-subscription.usecase.ts  # Criar assinatura no Stripe
├── gateway/
│   └── subscription-gateway.ts       # Interface do gateway de pagamento
├── repository/
│   └── subscription-repository.ts    # Interface do repositório
└── infra/
    ├── controller/
    │   ├── create-customer-controller.ts
    │   └── stripe-webhook.controller.ts
    └── webhook/
        └── stripe-webhook.controller.ts
```

## Entidade Subscription

A entidade `Subscription` é simples, sem `Observable` e sem validação via Either. O `create()` é **síncrono**.

```typescript
// Criar nova assinatura
const subscription = Subscription.create({
  id: 'sub_stripe_id',
  userId: 'user-uuid',
  billingSubscriptionId: 'sub_stripe_id',
  status: 'active',
})

// Mutações
subscription.activate()            // status → 'active', atualiza updatedAt
subscription.cancel()              // status → 'canceled', atualiza canceledAt e updatedAt
subscription.changeStatus('past_due') // altera status diretamente
```

### Propriedades

| Propriedade             | Tipo                      | Descrição                              |
|-------------------------|---------------------------|----------------------------------------|
| `id`                    | `string`                  | ID da assinatura no Stripe             |
| `userId`                | `string`                  | ID do usuário na aplicação             |
| `billingSubscriptionId` | `string`                  | ID da assinatura no Stripe             |
| `status`                | `SubscriptionStatusTypes` | Status da assinatura                   |
| `createdAt`             | `Date`                    | Data de criação                        |
| `updatedAt`             | `Date?`                   | Data de atualização                    |
| `canceledAt`            | `Date?`                   | Data de cancelamento                   |

### Status da Assinatura

```typescript
type SubscriptionStatusTypes =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'
```

## Gateway de Pagamento

Interface `SubscriptionGateway` em `gateway/subscription-gateway.ts`:

```typescript
export interface SubscriptionGateway {
  createCustomer(data: CreateCustomerInput): Promise<CreateCustomerResponse>
  attachPaymentMethodToCustomer(data: AttachPaymentMethodInput): Promise<void>
  createSubscription(data: CreateSubscriptionInput): Promise<CreateSubscriptionResponse>
  createPaymentMethod(): Promise<string>   // retorna paymentMethodId
}
```

### Implementações

| Ambiente    | Implementação                    |
|-------------|----------------------------------|
| Produção    | `StripeSubscriptionGateway`      |
| Testes      | `TestingSubscriptionGateway`     |

## Repository

Interface `SubscriptionRepository` em `repository/subscription-repository.ts`:

```typescript
export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>
  update(subscription: Subscription): Promise<void>
  ofId(id: string): Promise<Subscription | null>
  ofUserId(userId: string): Promise<Subscription | null>
}
```

## Use Cases

| Use Case                     | Input                                      | Output                                  |
|------------------------------|--------------------------------------------|-----------------------------------------|
| `CreateCustomerUseCase`      | `{ userId, email, name? }`                 | (sem Either — exceções em caso de erro) |
| `CreateSubscriptionUseCase`  | `{ userId, customerId, priceId }`          | `Promise<void>`                         |

### Exemplo — CreateSubscriptionUseCase

```typescript
@injectable()
export class CreateSubscriptionUseCase {
  constructor(
    @inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
    private readonly subscriptionGateway: SubscriptionGateway,
    @inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  public async execute(input: CreateSubscriptionUseCaseInput): Promise<void> {
    // 1. Cria método de pagamento
    const paymentMethodId = await this.subscriptionGateway.createPaymentMethod()

    // 2. Vincula método ao cliente
    await this.subscriptionGateway.attachPaymentMethodToCustomer({
      customerId: input.customerId,
      paymentMethodId,
    })

    // 3. Cria assinatura no Stripe
    const subscriptionResponse = await this.subscriptionGateway.createSubscription({
      ...input,
      paymentMethodId,
    })

    // 4. Persiste localmente
    const subscription = Subscription.create({
      status: subscriptionResponse.status,
      userId: input.userId,
      billingSubscriptionId: subscriptionResponse.subscriptionId,
      id: subscriptionResponse.subscriptionId,
    })
    await this.subscriptionRepository.save(subscription)
  }
}
```

## Webhook do Stripe

O controller `StripeWebhookController` recebe eventos do Stripe e atualiza o status das assinaturas localmente.

Fluxo:
1. Stripe envia evento para `POST /stripe/webhook`
2. Controller verifica assinatura do webhook (segurança)
3. Processa evento (ex: `customer.subscription.updated`, `invoice.payment_failed`)
4. Atualiza `Subscription` via repositório

Para iniciar o listener de webhook local durante desenvolvimento:
```bash
npm run "stripe webhook"
```

## Rotas HTTP

> As rotas não possuem arquivo `routes/` dedicado neste módulo; estão definidas diretamente nos controllers.

| Rota                    | Método | Proteção                             | Descrição               |
|-------------------------|--------|--------------------------------------|-------------------------|
| `POST /subscriptions`   | POST   | `isProtected: true`                  | Criar assinatura        |
| `POST /stripe/webhook`  | POST   | Verificação de assinatura Stripe     | Webhook do Stripe       |

## Erros

Este módulo lança exceções diretamente para falhas técnicas de gateway (sem padrão Either), pois erros de API de pagamento são excepcionais e não fazem parte do fluxo normal de negócio.

## IoC — Service Identifiers

Definidos em `src/shared/infra/ioc/module/service-identifier/subscription-types.ts`:

```typescript
export const SUBSCRIPTION_TYPES = {
  GATEWAYS: {
    Stripe: Symbol.for('StripeSubscriptionGateway'),
  },
  USE_CASES: {
    CreateCustomer:       Symbol.for('CreateCustomerSubscriptionUseCase'),
    CreateSubscription:   Symbol.for('CreateSubscriptionUseCase'),
    ActivateSubscription: Symbol.for('ActivateSubscriptionUseCase'),
    CancelSubscription:   Symbol.for('CancelSubscriptionUseCase'),
  },
  CONTROLLERS: {
    CreateCustomer: Symbol.for('CreateSubscriptionController'),
    StripeWebhook:  Symbol.for('StripeWebhookController'),
  },
  REPOSITORIES: {
    Subscription: Symbol.for('SubscriptionRepository'),
  },
} as const
```

## Variáveis de Ambiente Relevantes

| Variável                | Descrição                                          |
|-------------------------|----------------------------------------------------|
| `STRIPE_SECRET_KEY`     | Chave secreta da API do Stripe                     |
| `STRIPE_WEBHOOK_SECRET` | Segredo para verificar assinaturas de webhook      |
| `STRIPE_PRICE_ID`       | ID do preço/plano no Stripe                        |

## Testes

### Teste de Unidade

```typescript
import { TestingSubscriptionGateway } from '@/shared/infra/gateway/testing-subscription-gateway'
import { InMemorySubscriptionRepository } from '@/shared/infra/database/repository/in-memory/in-memory-subscription-repository'
import { CreateSubscriptionUseCase } from '@/subscription/application/use-case/create-subscription.usecase'

describe('CreateSubscriptionUseCase', () => {
  let sut: CreateSubscriptionUseCase
  let subscriptionGateway: TestingSubscriptionGateway
  let subscriptionRepository: InMemorySubscriptionRepository

  beforeEach(() => {
    container.snapshot()
    subscriptionGateway = new TestingSubscriptionGateway()
    subscriptionRepository = new InMemorySubscriptionRepository()
    sut = new CreateSubscriptionUseCase(subscriptionGateway, subscriptionRepository)
  })
  afterEach(() => container.restore())

  it('deve criar assinatura com sucesso', async () => {
    await expect(sut.execute({
      userId: 'user-uuid',
      customerId: 'cus_test',
      priceId: 'price_test',
    })).resolves.not.toThrow()

    const saved = await subscriptionRepository.ofUserId('user-uuid')
    expect(saved).not.toBeNull()
    expect(saved?.status).toBe('active')
  })
})
```
