# Tarefa 2.0: Atualizar Entidade Subscription e Interfaces de Domínio

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Estender o modelo de domínio e os contratos de interface para suportar as operações necessárias pelos webhooks. A entidade `Subscription` precisa do campo `customerId` para que `HandlePaymentFailedUseCase` possa localizar assinaturas via `invoice.customer`. As interfaces de repositório e gateway precisam dos novos métodos de busca e de criação de evento de webhook.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`**: `customerId` deve ser campo obrigatório na entidade — não usar campo opcional como atalho
- **`tdd`**: escrever testes antes de implementar alterações na entidade
</skills>

<requirements>

- A entidade `Subscription` deve expor `customerId: string` como propriedade pública
- Os métodos `Subscription.create()` e `Subscription.restore()` devem aceitar `customerId` como parâmetro obrigatório
- A interface `SubscriptionRepository` deve incluir `ofBillingSubscriptionId(id: string): Promise<Subscription | null>` e `ofCustomerId(customerId: string): Promise<Subscription | null>`
- A interface `SubscriptionGateway` deve incluir `createEventWebhook(rawBody: string | Buffer, signature: string): Promise<Stripe.Event>`
- A nova interface `StripeWebhookEventRepository` deve ter `markAsProcessed(eventId: string, eventType: string): Promise<void>` e `withTransaction<TX>(tx: TX): StripeWebhookEventRepository`
- `markAsProcessed` deve lançar `DuplicateWebhookEventError` (ou equivalente) se o `eventId` já existir

</requirements>

## Subtarefas

- [ ] 2.1 Adicionar campo `customerId` à entidade `Subscription` em `src/subscription/domain/subscription.ts` — atualizar construtor privado, `create()`, `restore()` e getter
- [ ] 2.2 Atualizar `SubscriptionRepository` em `src/subscription/repository/subscription-repository.ts` com `ofBillingSubscriptionId` e `ofCustomerId`
- [ ] 2.3 Adicionar `createEventWebhook` à interface `SubscriptionGateway` em `src/subscription/gateway/subscription-gateway.ts`
- [ ] 2.4 Criar a interface `StripeWebhookEventRepository` em `src/subscription/repository/stripe-webhook-event-repository.ts`
- [ ] 2.5 Atualizar `src/shared/infra/gateway/testing-subscription-gateway.ts` para implementar `createEventWebhook` (stub para testes)
- [ ] 2.6 Verificar que `pnpm tsc:check` passa

## Detalhes de Implementação

Consultar seção **"Interfaces Principais"** e **"Entidade Subscription (campo novo)"** da `techspec.md` para as assinaturas exatas.

O método `createEventWebhook` no gateway de produção (`StripeSubscriptionGateway`) já pode existir parcialmente — verificar antes de sobrescrever.

O `customerId` deve seguir o mesmo padrão dos outros campos da entidade: armazenado como primitivo `string` internamente, exposto via getter, recebido como `string` no `create()` e `restore()`.

## Critérios de Sucesso

- Entidade `Subscription` compila com o novo campo `customerId` obrigatório
- `SubscriptionRepository` declara os dois novos métodos de busca
- `SubscriptionGateway` declara `createEventWebhook`
- `StripeWebhookEventRepository` existe como interface com `markAsProcessed` e `withTransaction`
- `testing-subscription-gateway.ts` compila sem erros implementando o novo método
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade: verificar que `Subscription.create({ ..., customerId: 'cus_xxx' })` retorna entidade com `customerId` correto; verificar que `Subscription.restore({ ..., customerId: 'cus_xxx' })` restaura o campo

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/subscription/domain/subscription.ts`
- `src/subscription/repository/subscription-repository.ts`
- `src/subscription/repository/stripe-webhook-event-repository.ts` (novo)
- `src/subscription/gateway/subscription-gateway.ts`
- `src/shared/infra/gateway/testing-subscription-gateway.ts`
