# Tarefa 1.0: Criar SubscriptionLifecycleService

<critical>Ler os arquivos de techspec.md desta pasta antes de iniciar. Se você não ler esse arquivo sua tarefa será invalidada</critical>

## Visão Geral

Criar o `SubscriptionLifecycleService` — Domain Service injectable que centraliza toda a orquestração de estado entre `Subscription` e `User` num único ponto. Atualmente, os três use cases de subscription (`activate`, `cancel`, `handlePaymentFailed`) duplicam a lógica de busca de subscription, mutação de estado e persistência de user. Esta tarefa extrai essa orquestração para um serviço dedicado, registra no IoC (Inversify) e adapta os três use cases para delegar a ele.

<skills>
### Conformidade com Skills Padrões

- `tdd` — escrever testes antes da implementação do serviço
- `no-workarounds` — nenhuma gambiarra; eliminar duplicação real com root-cause fix
- `test-antipatterns` — testes testam através da interface, não da implementação interna
- `vitest` — todos os testes usam Vitest conforme padrão do projeto
- `systematic-debugging` — aplicar se falhas surgirem durante a migração dos use cases
</skills>

<requirements>
- O `SubscriptionLifecycleService` deve implementar os métodos `activate()`, `cancel()` e `handlePaymentFailed()` conforme interface definida na techspec.md
- Deve receber `tx?: object` e propagá-lo via `withTransaction()` para ambos os repositories (rollback atômico)
- Deve retornar `Either<SubscriptionNotFoundError, null>` em todos os métodos
- Deve lançar `Error` (técnico) quando user não for encontrado após subscription existir
- Deve ser registrado no Inversify como singleton com symbol `SUBSCRIPTION_TYPES.SERVICES.Lifecycle`
- Os três use cases devem passar a delegar ao serviço — sem duplicação de lógica de orquestração
- Os testes business-flow existentes de subscription devem continuar passando sem alteração
</requirements>

## Subtarefas

- [ ] 1.1 Adicionar symbol `SERVICES.Lifecycle` em `subscription-types.ts`
- [ ] 1.2 Criar interface `SubscriptionLifecycleService` em `src/subscription/application/service/`
- [ ] 1.3 Criar implementação `SubscriptionLifecycleServiceImpl` com os três métodos
- [ ] 1.4 Registrar binding no `subscription-container.ts` (singleton)
- [ ] 1.5 Adaptar `ActivateSubscriptionUseCase` para injetar e delegar ao serviço
- [ ] 1.6 Adaptar `CancelSubscriptionUseCase` para injetar e delegar ao serviço
- [ ] 1.7 Adaptar `HandlePaymentFailedUseCase` para injetar e delegar ao serviço
- [ ] 1.8 Escrever testes unitários do `SubscriptionLifecycleService` (ver seção Testes)
- [ ] 1.9 Verificar que testes business-flow existentes de subscription continuam passando

## Detalhes de Implementação

Consultar **techspec.md** — seções:
- `### Interfaces Principais` → interface completa do `SubscriptionLifecycleService`
- `### Inversify IoC Container` → symbol identifier e local de registro
- `### Tratamento de Transação` → comportamento de rollback atômico via `tx?`
- `### Sequenciamento de Desenvolvimento` → justificativa de ordem
- `### Arquivos Relevantes e Dependentes` → bloco "Candidato 5"

## Critérios de Sucesso

- `pnpm --filter backend tsc:check` passa sem erros
- `pnpm --filter backend biome:fix` passa com zero issues
- `pnpm --filter backend test:run` — todos os testes unitários novos passam
- `pnpm --filter backend test:business-flow` — todos os testes existentes de subscription continuam passando
- `pnpm --filter backend build` conclui sem erros
- Os três use cases não contêm mais lógica de busca/mutação de Subscription + User (apenas delegam)

## Testes da Tarefa

- [ ] **Unitários** (`subscription-lifecycle.service.test.ts`):
  - `activate()` — subscription encontrada, user ativado, retorna `success(null)`
  - `cancel()` — subscription encontrada, user suspenso, retorna `success(null)`
  - `handlePaymentFailed()` — subscription encontrada, user suspenso, subscription `past_due`, retorna `success(null)`
  - `activate()` com subscription inexistente → retorna `failure(SubscriptionNotFoundError)`
  - `cancel()` com user não encontrado após subscription existir → lança `Error` técnico
  - Propagação de `tx?` — mock verifica que `withTransaction()` é chamado em ambos os repositories
- [ ] **Integração** (`activate-subscription.business-flow-test.ts`, `cancel-subscription.business-flow-test.ts`, `handle-payment-failed.business-flow-test.ts`):
  - Verificar que os fluxos HTTP existentes continuam produzindo os mesmos resultados

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/subscription/application/service/subscription-lifecycle.service.ts` *(novo)*
- `src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- `src/shared/infra/ioc/module/subscription/subscription-container.ts`
- `src/subscription/application/use-case/activate-subscription.usecase.ts`
- `src/subscription/application/use-case/cancel-subscription.usecase.ts`
- `src/subscription/application/use-case/handle-payment-failed.usecase.ts`
- `src/subscription/repository/subscription-repository.ts`
- `src/user/application/persistence/repository/user-repository.ts`
- `src/subscription/infra/worker/stripe-webhook-worker.ts`
