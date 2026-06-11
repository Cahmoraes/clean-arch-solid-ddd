# Tarefa 8.0: Completar Fluxo Backend-Driven de Criação de Assinaturas

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Habilitar o cliente a iniciar uma assinatura via API do backend (`POST /subscriptions`), removendo o atalho de teste `tok_visa` e fechando o ciclo completo de vida da assinatura — desde a criação síncrona orquestrada pelo backend até a reconciliação defensiva via webhook em caso de falha parcial.

Hoje, o `CreateSubscriptionUseCase` está implementado e registrado no IoC, porém **órfão**: nenhum Controller HTTP, Worker ou outro Use Case o invoca. Sem ele sendo executado, a Subscription nunca é persistida localmente — e o primeiro webhook `customer.subscription.updated` que chegar do Stripe falhará com `SubscriptionNotFoundError` (ver `ActivateSubscriptionUseCase`), pois ele consulta `subscriptionRepository.ofBillingSubscriptionId()` esperando que o registro já exista.

A decisão arquitetural confirmada é: **backend orquestra a criação** (Stripe Elements no frontend tokeniza o cartão e envia `pm_xxx` para esta API; backend não usa Stripe Checkout/Payment Link).

<skills>
### Conformidade com Skills Padrões

- **`tdd`**: ciclo red-green-refactor por subtarefa — começar pelo refactor do use case (8.1) com testes falhando primeiro
- **`no-workarounds`**: remover `tok_visa` hard-coded é literalmente eliminar um workaround; aplicar a skill ao decidir como o gateway expõe (ou não) `createPaymentMethod`
- **`test-antipatterns`**: usar `InMemorySubscriptionRepository`, `InMemoryUserRepository` e `TestingSubscriptionGateway` reais — sem mocks de framework
- **`systematic-debugging`**: aplicar caso surjam falhas de integração entre Controller → UseCase → Gateway → Worker
</skills>

<requirements>
- Frontend deve poder enviar `POST /subscriptions { priceId, paymentMethodId }` autenticado via JWT e receber `201 { subscriptionId, status }` em sucesso
- `CreateSubscriptionUseCase` não pode mais gerar `paymentMethodId` internamente — deve recebê-lo obrigatoriamente do input
- A interface de produção `SubscriptionGateway` não deve expor `createPaymentMethod()` (responsabilidade exclusiva de teste)
- `Subscription` persistida localmente deve conter o `customerId` correto vindo do User autenticado
- Worker deve tratar `customer.subscription.created` como reconciliação idempotente (cria local se não existir, ignora se já existir) — protege contra inconsistência se houver crash entre `stripe.subscriptions.create()` e `subscriptionRepository.save()` no use case
- Não pode haver `console.log` de debug no caminho final (limpar resíduos em `create-customer.usecase.ts` e `create-subscription.usecase.ts`)
- Erro `BillingCustomerNotProvisionedError` (novo) é retornado quando o User autenticado ainda não tem `billingCustomerId` (caso de eventual consistency do subscriber `userCreated → createCustomer`)
- Todos os comandos obrigatórios devem passar 100%: `pnpm biome:fix && pnpm tsc:check && pnpm test:run && pnpm build && pnpm fit:validate-dependencies`
</requirements>

## Subtarefas

- [x] 8.1 Refatorar `CreateSubscriptionUseCase`: input com `paymentMethodId` obrigatório; output `Either<BillingCustomerNotProvisionedError | Error, { subscriptionId, status }>`; suporte opcional a `tx?: object`; remover chamada interna a `subscriptionGateway.createPaymentMethod()`; remover `console.log`; persistir `customerId` no agregado `Subscription`
- [x] 8.2 Mover `createPaymentMethod()` exclusivamente para `TestingSubscriptionGateway`; remover do contrato `SubscriptionGateway` e da implementação `StripeSubscriptionGateway`
- [x] 8.3 Criar `BillingCustomerNotProvisionedError` em `src/subscription/application/error/`
- [x] 8.4 Criar `CreateSubscriptionController` em `src/subscription/infra/controller/create-subscription.controller.ts`: rota `POST /subscriptions` (`isProtected: true`), parsing Zod do body `{ priceId, paymentMethodId }`, extração de `userId` do JWT, busca de `billingCustomerId` via `userRepository.userOfId(userId)`, retorno `409 Conflict` quando `BillingCustomerNotProvisionedError`, `201 Created` em sucesso com `{ subscriptionId, status }`
- [x] 8.5 Adicionar `SubscriptionRoutes.CREATE = "/subscriptions"` em `subscription-routes.ts`
- [x] 8.6 Atualizar IoC: adicionar `CreateSubscription: Symbol.for("CreateSubscriptionController")` em `SUBSCRIPTION_TYPES.CONTROLLERS`; registrar binding em `subscription-module.ts`; adicionar controller ao array em `setup-subscription-module.ts`
- [x] 8.7 Adicionar handler `customer.subscription.created` no `StripeWebhookWorker`: inserir `"customer.subscription.created"` em `EVENT_TYPE` e no switch do `routeEvent`; criar método `handleCreated` que persiste a Subscription se não existir (consulta via `ofBillingSubscriptionId`), ignora silenciosamente se já existir (idempotência); usar `customerId` extraído de `eventData.data.object.customer`
- [x] 8.8 Limpar `console.log` residuais em `create-customer.usecase.ts` (linhas 54, 56-57)
- [x] 8.9 Testes unitários do `CreateSubscriptionUseCase` refatorado: sucesso retorna `{ subscriptionId, status }`; falha do gateway no `attach`; falha do gateway no `create`; persistência salva `customerId` correto; sem `paymentMethodId` no input → erro de tipo (compile-time)
- [x] 8.10 Teste business-flow do `CreateSubscriptionController`: `201` em sucesso; `401` sem JWT; `409` quando user sem `billingCustomerId`; `400` em body inválido (Zod)
- [x] 8.11 Teste unitário do worker para `customer.subscription.created`: cria Subscription nova quando não existe local; ignora silenciosamente quando já existe; persiste com `customerId` correto extraído do evento
- [x] 8.12 Validação final: executar `pnpm biome:fix && pnpm tsc:check && pnpm test:run && pnpm build && pnpm fit:validate-dependencies` — todos devem passar 100%

## Detalhes de Implementação

Esta tarefa **complementa** o fluxo já descrito na techspec (seções "Arquitetura do Sistema" e "Fluxo de dados"), fechando o gap de criação síncrona da Subscription que era pré-requisito implícito do `ActivateSubscriptionUseCase` (referenciado na techspec linha 195).

**Fluxo HTTP completo (novo) — POST /subscriptions:**

```
[Frontend Stripe.js]                    [Backend]                            [Stripe API]
       │                                   │                                       │
       │── createPaymentMethod() ─────────────────────────────────────────────────▶│
       │◀── pm_xxx ────────────────────────────────────────────────────────────────│
       │                                   │                                       │
       │── POST /subscriptions ──────────▶ │                                       │
       │   { priceId, paymentMethodId }    │ JWT → userId                          │
       │                                   │ userRepo.userOfId(userId)             │
       │                                   │ if !user.billingCustomerId:           │
       │                                   │   return 409 (BillingCustomerNotProv) │
       │                                   │                                       │
       │                                   │── attachPaymentMethodToCustomer ─────▶│
       │                                   │── createSubscription ────────────────▶│
       │                                   │◀── { subscriptionId, status } ────────│
       │                                   │ subscriptionRepo.save(subscription)   │
       │◀── 201 { subscriptionId, status } │                                       │
       │                                   │                                       │
       │                                   │   [eventualmente, async]              │
       │                                   │◀── webhook customer.subscription.updated (status: active)
       │                                   │ → ActivateSubscriptionUseCase
```

**Reconciliação defensiva (subtarefa 8.7):** se o backend crashar entre `subscriptionGateway.createSubscription()` e `subscriptionRepository.save()`, a assinatura existe no Stripe mas não localmente — o cliente seria cobrado sem registro. O Stripe envia `customer.subscription.created` logo após criar; o worker, ao receber, persiste localmente se ausente. Como o `event_id` é único e o `markAsProcessed` é insert-first (techspec seção "Decisões Principais"), a operação é segura mesmo em concorrência com o use case.

**Decisões alinhadas à techspec:**

- Use case retorna `Either` (techspec seção "Either para use cases novos") — alteração: substitui o atual `Promise<void>`.
- Suporte a `tx?: object` no use case para alinhar com padrão `CheckInUseCase` referenciado na techspec linha 273.
- `customerId` direto na `Subscription` (techspec seção "`customerId` direto na `Subscription`") — já está no agregado desde a task 2.0; aqui apenas garantimos que o use case **realmente** o passa em vez de derivar.

**Considerações específicas desta tarefa (não cobertas na techspec original):**

- A interface `SubscriptionGateway` perde o método `createPaymentMethod()` — verificar se há outros consumidores além de testes; em produção, `pm_xxx` sempre vem do frontend via Stripe Elements.
- O Controller precisa decidir o status HTTP para `BillingCustomerNotProvisionedError`: usar `409 Conflict` (estado inconsistente, retentar é viável) em vez de `400` (que sugere erro do cliente).

**Referências cruzadas:**

- techspec.md seções: "Visão Geral dos Componentes" (componentes modificados), "Design de Implementação" (assinatura dos use cases com `tx`), "Pontos de Integração" (Stripe SDK), "Considerações Técnicas" (decisões de Either e transação)
- prd.md: requisitos de ciclo de vida da assinatura

## Critérios de Sucesso

- Cliente autenticado consegue criar assinatura via `POST /subscriptions` com `paymentMethodId` real (validado em business-flow test usando `TestingSubscriptionGateway`)
- Subscription é persistida localmente com `customerId`, `userId`, `billingSubscriptionId` e `status` corretos imediatamente após o `201`
- `tok_visa` não aparece mais no caminho de produção — `pnpm build` não inclui `createPaymentMethod` no `StripeSubscriptionGateway`
- Webhook `customer.subscription.created` recebido para uma Subscription **já existente** localmente é ignorado sem erro (idempotência)
- Webhook `customer.subscription.created` recebido para uma Subscription **inexistente** localmente cria o registro com os mesmos campos que o `CreateSubscriptionUseCase` criaria
- Sequência completa funciona end-to-end: `POST /users` → `userCreated` → `createCustomer` → `POST /subscriptions` → webhook `subscription.updated (active)` → User e Subscription com status `ACTIVE` no banco
- Zero `console.log` no caminho final dos use cases tocados
- Todos os comandos obrigatórios passam 100%: `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run`, `pnpm build`, `pnpm fit:validate-dependencies`

## Testes da Tarefa

- [ ] Testes de unidade
  - `CreateSubscriptionUseCase` (refatorado): sucesso, falha no `attach`, falha no `create`, persistência com `customerId` correto, retorno tipado `{ subscriptionId, status }`
  - `StripeWebhookWorker.handleCreated`: cria nova Subscription, idempotência (ignora se existe), extração correta de `customerId` do evento
  - `BillingCustomerNotProvisionedError`: erro de domínio com mensagem clara
- [ ] Testes de integração (business-flow)
  - `POST /subscriptions` com JWT válido + user com `billingCustomerId` → `201`
  - `POST /subscriptions` sem JWT → `401`
  - `POST /subscriptions` com user sem `billingCustomerId` → `409`
  - `POST /subscriptions` com body inválido (sem `priceId` ou `paymentMethodId`) → `400`
  - `POST /webhook/stripe` com evento `customer.subscription.created` (assinatura válida) → `200` e Subscription criada localmente
- [ ] Testes E2E (não aplicável — backend-only, sem frontend nesta entrega; a integração real com Stripe Elements é responsabilidade do consumer da API)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Novos:**
- `src/subscription/infra/controller/create-subscription.controller.ts`
- `src/subscription/application/error/billing-customer-not-provisioned-error.ts`
- `src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`

**Modificados:**
- `src/subscription/application/use-case/create-subscription.usecase.ts` (refactor: input/output, remoção de `createPaymentMethod`, suporte a `tx`)
- `src/subscription/application/use-case/create-subscription.usecase.test.ts` (adaptar para novo contrato)
- `src/subscription/application/use-case/create-customer.usecase.ts` (limpar `console.log`)
- `src/subscription/gateway/subscription-gateway.ts` (remover `createPaymentMethod` do contrato)
- `src/shared/infra/gateway/stripe-subscription-gateway.ts` (remover `createPaymentMethod`)
- `src/shared/infra/gateway/testing-subscription-gateway.ts` (manter/centralizar `createPaymentMethod` como helper de teste)
- `src/subscription/infra/controller/routes/subscription-routes.ts` (adicionar `CREATE`)
- `src/subscription/infra/worker/stripe-webhook-worker.ts` (adicionar `EVENT_TYPE` e handler `handleCreated`)
- `src/subscription/infra/worker/stripe-webhook.worker.test.ts` (adicionar cenários do novo handler)
- `src/shared/infra/ioc/module/service-identifier/subscription-types.ts` (`CONTROLLERS.CreateSubscription`)
- `src/shared/infra/ioc/module/subscription/subscription-module.ts` (binding do controller)
- `src/bootstrap/setup-subscription-module.ts` (registrar controller)
