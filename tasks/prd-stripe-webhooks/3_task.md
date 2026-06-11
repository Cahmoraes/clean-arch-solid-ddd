# Tarefa 3.0: Implementar Repositórios

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar as três classes concretas de repositório que suportam os use cases e a idempotência de webhooks. O `InMemorySubscriptionRepository` é necessário para os testes de unidade. O `PrismaSubscriptionRepository` é a implementação de produção. O `PrismaStripeWebhookEventRepository` garante que cada evento Stripe seja processado exatamente uma vez usando unique constraint do banco.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`**: a idempotência deve usar insert-first com captura de unique violation — não usar SELECT-then-INSERT
- **`test-antipatterns`**: usar `InMemorySubscriptionRepository` nos testes dos use cases, não mocks de framework
- **`systematic-debugging`**: se o insert-first não capturar o erro de duplicata corretamente, diagnosticar o código de erro Prisma (`P2002`) antes de ajustar
</skills>

<requirements>

- `InMemorySubscriptionRepository` deve implementar `ofBillingSubscriptionId` e `ofCustomerId` buscando na coleção em memória
- `PrismaSubscriptionRepository` deve implementar todos os métodos da interface `SubscriptionRepository` incluindo os dois novos
- `PrismaSubscriptionRepository` deve usar o padrão `withTransaction(tx)` já estabelecido no projeto para suporte a transações
- `PrismaStripeWebhookEventRepository` deve implementar `markAsProcessed(eventId, eventType)` tentando INSERT direto
- Quando o INSERT falhar com violação de unique constraint (Prisma error code `P2002`), `PrismaStripeWebhookEventRepository` deve lançar `DuplicateWebhookEventError`
- `PrismaStripeWebhookEventRepository` deve implementar `withTransaction(tx)`

</requirements>

## Subtarefas

- [ ] 3.1 Atualizar `InMemorySubscriptionRepository` em `src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts` com os métodos `ofBillingSubscriptionId` e `ofCustomerId`
- [ ] 3.2 Criar `PrismaSubscriptionRepository` em `src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts` implementando toda a interface `SubscriptionRepository`
- [ ] 3.3 Criar `PrismaStripeWebhookEventRepository` em `src/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository.ts` com insert-first e captura de `P2002`
- [ ] 3.4 Criar erro `DuplicateWebhookEventError` (se não existir) em `src/subscription/application/error/`
- [ ] 3.5 Verificar que `pnpm tsc:check` passa

## Detalhes de Implementação

Consultar seção **"Pontos de Integração — Prisma (idempotência)"** e **"Sequenciamento de Desenvolvimento"** da `techspec.md`.

O padrão `withTransaction(tx)` já existe em outros repositórios Prisma do projeto — seguir a mesma convenção para consistência.

Para o insert-first, o código de erro Prisma para violação de unique constraint é `P2002`. O repositório deve capturar `PrismaClientKnownRequestError`, verificar o code e relançar `DuplicateWebhookEventError`.

## Critérios de Sucesso

- `InMemorySubscriptionRepository` implementa os dois novos métodos e os testes de unidade passam
- `PrismaSubscriptionRepository` compila e implementa toda a interface
- `PrismaStripeWebhookEventRepository` lança `DuplicateWebhookEventError` ao tentar inserir `eventId` duplicado
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade: `InMemorySubscriptionRepository.ofBillingSubscriptionId` retorna a assinatura correta ou `null`; `ofCustomerId` retorna a assinatura correta ou `null`
- [ ] Testes de integração (Prisma): `PrismaSubscriptionRepository.ofBillingSubscriptionId` e `ofCustomerId` localizam pelo campo correto; `PrismaStripeWebhookEventRepository` retorna `DuplicateWebhookEventError` na segunda inserção com mesmo `eventId`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts` (novo)
- `src/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository.ts` (novo)
- `src/subscription/application/error/duplicate-webhook-event-error.ts` (novo, se necessário)
