# Tarefa 4.0: Criar Erros de Domínio e Use Cases

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar os três use cases que processam os eventos Stripe e o erro de domínio compartilhado entre eles. Cada use case localiza a assinatura, aplica a mudança de estado via métodos da entidade, afeta o usuário vinculado e persiste as alterações. Todos retornam `Either<SubscriptionNotFoundError, void>`. Os use cases aceitam `tx` opcional para participar de transação externa controlada pelo worker.

<skills>
### Conformidade com Skills Padrões

- **`tdd`**: usar ciclo red-green-refactor — escrever o teste antes da implementação; começar por `ActivateSubscriptionUseCase` como tracer bullet
- **`no-workarounds`**: nunca lançar exceção para lógica de negócio — sempre retornar `failure(SubscriptionNotFoundError)`
- **`test-antipatterns`**: usar `InMemorySubscriptionRepository` e `InMemoryUserRepository` reais nos testes — não criar mocks de framework
</skills>

<requirements>

- `SubscriptionNotFoundError` deve existir em `src/subscription/application/error/subscription-not-found-error.ts`
- `ActivateSubscriptionUseCase`: localiza por `billingSubscriptionId`, ativa a subscription, ativa o usuário (se suspenso), persiste via repositório
- `CancelSubscriptionUseCase`: localiza por `billingSubscriptionId`, chama `subscription.cancel()`, suspende o usuário, persiste
- `HandlePaymentFailedUseCase`: localiza por `customerId`, atualiza status para `past_due`, suspende o usuário, persiste
- Todos os use cases retornam `Either<SubscriptionNotFoundError, void>`
- Todos aceitam `tx?: object` como segundo parâmetro e usam `repository.withTransaction(tx)` quando fornecido
- Use cases devem ser idempotentes: ativar uma subscription já ativa não causa erro

</requirements>

## Subtarefas

- [ ] 4.1 Criar `SubscriptionNotFoundError` em `src/subscription/application/error/subscription-not-found-error.ts`
- [ ] 4.2 Escrever testes de unidade para `ActivateSubscriptionUseCase` (red) → implementar (green) → refatorar
  - cenário: assinatura encontrada → ativa subscription + ativa user → `success()`
  - cenário: assinatura não encontrada → `failure(SubscriptionNotFoundError)`
- [ ] 4.3 Criar `ActivateSubscriptionUseCase` em `src/subscription/application/use-case/activate-subscription.usecase.ts`
- [ ] 4.4 Escrever testes de unidade para `CancelSubscriptionUseCase` (red) → implementar (green)
  - cenário: assinatura encontrada → cancela subscription + suspende user → `success()`
  - cenário: assinatura não encontrada → `failure(SubscriptionNotFoundError)`
- [ ] 4.5 Criar `CancelSubscriptionUseCase` em `src/subscription/application/use-case/cancel-subscription.usecase.ts`
- [ ] 4.6 Escrever testes de unidade para `HandlePaymentFailedUseCase` (red) → implementar (green)
  - cenário: assinatura encontrada → status `past_due` + suspende user → `success()`
  - cenário: assinatura não encontrada → `failure(SubscriptionNotFoundError)`
- [ ] 4.7 Criar `HandlePaymentFailedUseCase` em `src/subscription/application/use-case/handle-payment-failed.usecase.ts`
- [ ] 4.8 Executar `pnpm test:run` e verificar que todos os testes novos passam

## Detalhes de Implementação

Consultar seção **"Assinatura dos novos use cases"** e **"Abordagem de Testes — Testes Unidade"** da `techspec.md` para os tipos de input/output e cenários de teste esperados.

O padrão de use case do projeto: injetar repositórios via `@inject` do Inversify, retornar `Either`, usar `unitOfWork` quando há transação. Verificar `src/check-in/application/use-case/` como referência de implementação com `tx`.

A entidade `Subscription` deve ter métodos como `activate()`, `cancel()` e `markAsPastDue()` — verificar se já existem ou se precisam ser criados junto com esta tarefa.

## Critérios de Sucesso

- `SubscriptionNotFoundError` criado
- Os três use cases implementados e decorados com `@injectable()`
- Todos os testes de unidade passam (`pnpm test:run`)
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade — `activate-subscription.usecase.test.ts`: assinatura encontrada → sucesso; não encontrada → failure
- [ ] Testes de unidade — `cancel-subscription.usecase.test.ts`: assinatura encontrada → sucesso; não encontrada → failure
- [ ] Testes de unidade — `handle-payment-failed.usecase.test.ts`: assinatura encontrada → sucesso; não encontrada → failure

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/subscription/application/error/subscription-not-found-error.ts` (novo)
- `src/subscription/application/use-case/activate-subscription.usecase.ts` (novo)
- `src/subscription/application/use-case/cancel-subscription.usecase.ts` (novo)
- `src/subscription/application/use-case/handle-payment-failed.usecase.ts` (novo)
- `src/subscription/application/use-case/activate-subscription.usecase.test.ts` (novo)
- `src/subscription/application/use-case/cancel-subscription.usecase.test.ts` (novo)
- `src/subscription/application/use-case/handle-payment-failed.usecase.test.ts` (novo)
- `src/subscription/domain/subscription.ts` (verificar/adicionar métodos de mutação)
