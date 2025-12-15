Plano de Implementação: Integração Stripe - Criar Assinatura na Academia

Resumo
- Objetivo: Implementar do zero um método de pagamento com Stripe para criação de assinaturas.
- Escopo: criação de customer (se necessário), associação de payment method, criação da assinatura no Stripe, persistência de `billing_subscription_id` e `status` no banco, tratamento de webhooks para sincronização de status.

Passos de Alto Nível
1. Gateway Stripe
  - Arquivo: src/shared/infra/gateway/stripe-subscription-gateway.ts
  - Símbolo: StripeSubscriptionGateway
  - Responsabilidades:
    - `createCustomer(user: {email, name, userId}): Promise<{customerId}>`
    - `createPaymentMethod(paymentInfo): Promise<{paymentMethodId}>`
    - `attachPaymentMethodToCustomer(customerId, paymentMethodId)`
    - `createSubscription({customerId, priceId}): Promise<{subscriptionId, status}>`
    - `constructEvent(rawBody, signature, webhookSecret): Stripe.Event` (validação de assinatura)
  - Notas: usar SDK oficial `stripe` e mapear resultados para tipos do domínio.

2. Repositório Prisma para Subscription
  - Arquivo: src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts
  - Símbolo: PrismaSubscriptionRepository implements SubscriptionRepository
  - Métodos: `save(subscription)`, `update(subscription)`, `ofId(id)`, `ofUserId(userId)`
  - Mapear campos: `billing_subscription_id`, `status`, `canceled_at`
  - Usar Prisma Client já existente no projeto; suportar `.withTransaction(tx)` se UnitOfWork estiver presente.

3. Use Cases
  - Revisar/estender: src/subscription/application/use-case/create-subscription.usecase.ts (CreateSubscriptionUseCase)
    - Input: userId, paymentMethodData (ou paymentMethodId), priceId (env STRIPE_PRICE_ID ou enviado)
    - Fluxo: garantir Customer local -> criar/obter customer no Stripe -> attach paymentMethod -> createSubscription -> persistir Subscription com billing_subscription_id e status
  - Novo: src/subscription/application/use-case/sync-subscription-status.usecase.ts (SyncSubscriptionStatusUseCase)
    - Input: eventPayload (construído pelo gateway)
    - Fluxo: pegar subscription pelo billing_subscription_id, atualizar status e canceled_at conforme payload, publicar DomainEvents se necessário
  - Opcional: UpdatePaymentStatusUseCase para lógica de retry / notificações

4. Controllers e Rotas
  - Novo SubscriptionController
    - Arquivo: src/subscription/infra/controller/subscription.controller.ts
    - Endpoint: `POST /subscriptions` -> `CreateSubscriptionUseCase`
  - Revisar StripeWebhookController
    - Arquivo: src/subscription/infra/controller/stripe-webhook.controller.ts
    - Garantir registro da rota com rawBody:true no Fastify
    - Validar assinatura via `StripeSubscriptionGateway.constructEvent`
    - Delegar evento para `SyncSubscriptionStatusUseCase`

5. IOC / Bootstrap
  - Atualizar: src/shared/infra/ioc/module/subscription/subscription-container.ts
    - Bind `SUBSCRIPTION_TYPES.Repositories.Subscription` -> `PrismaSubscriptionRepository` (prod) / `InMemorySubscriptionRepository` (test)
    - Bind `SUBSCRIPTION_TYPES.Gateways.Stripe` -> `StripeSubscriptionGateway` provider dependendo do env
  - Registrar controllers em src/bootstrap/setup-subscription-module.ts

6. Tests
  - Unitários:
    - src/subscription/application/use-case/create-subscription.usecase.test.ts
      - Cobrir happy-path + falhas do gateway (payment failed, price invalid)
    - src/subscription/application/use-case/sync-subscription-status.usecase.test.ts
      - Cobrir atualização de status por eventos distintos (invoice.payment_succeeded, customer.subscription.updated, invoice.payment_failed)
  - Business-flow:
    - src/subscription/infra/controller/create-subscription.business-flow-test.ts
      - Testar POST /subscriptions com container rebind para TestingSubscriptionGateway e InMemoryRepository
    - src/subscription/infra/controller/stripe-webhook.controller.business-flow-test.ts
      - Testar endpoint /webhook/stripe com payloads raw assinados (usar TestingSubscriptionGateway para gerar eventos)

7. Migrations / Prisma Schema
  - Revisar prisma/schema.prisma para garantir campos: `billing_subscription_id`, `status`, `canceled_at`
  - Nenhuma migration estrutural necessariamente nova — se adicionar campos, criar migration via `npm run prisma:migrate:dev`.

8. Configuração / Env
  - Variáveis necessárias:
    - STRIPE_PRIVATE_KEY
    - STRIPE_PUBLIC_KEY
    - STRIPE_PRICE_ID
    - STRIPE_WEBHOOK_SECRET
  - Documentar em docs/plan/payment-integration

9. Observações de Segurança e Operação
  - Webhook: validar assinatura; manter endpoint protegido contra replay (idempotência)
  - Mapear corretamente enums entre Stripe e domínio
  - Reconciliar assinaturas existentes (script de migração) se necessário

Checklist Rápido (Resumo de Arquivos a Criar/Modificar)
- Criar/Modificar:
  - src/shared/infra/gateway/stripe-subscription-gateway.ts (criar/estender)
  - src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts (criar)
  - src/subscription/application/use-case/create-subscription.usecase.ts (revisar)
  - src/subscription/application/use-case/sync-subscription-status.usecase.ts (criar)
  - src/subscription/infra/controller/subscription.controller.ts (criar)
  - src/subscription/infra/controller/stripe-webhook.controller.ts (revisar)
  - src/shared/infra/ioc/module/subscription/subscription-container.ts (atualizar binds)
  - src/bootstrap/setup-subscription-module.ts (registrar controller)
  - testes unitários e business-flow listados acima

Próximo passo
- Quer que eu gere os arquivos scaffold (implementação inicial + testes skeletons) agora? Se sim, digo quais arquivos vou criar e prossigo.
