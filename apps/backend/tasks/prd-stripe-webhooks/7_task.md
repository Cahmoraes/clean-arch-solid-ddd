# Tarefa 7.0: Configurar IoC, Bootstrap e Fila

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Registrar todos os novos componentes no container de inversão de controle (Inversify) e configurar a infraestrutura de fila necessária. Esta tarefa conecta todas as peças implementadas nas tarefas anteriores: use cases, worker, repositórios e a fila RabbitMQ passam a ser resolvidos automaticamente pelo container em tempo de execução.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`**: registrar todos os bindings corretamente — não usar `container.get()` manual como atalho
- **`systematic-debugging`**: se o container falhar ao resolver dependências, verificar a ordem de bindings e os symbols antes de ajustar
</skills>

<requirements>

- `SUBSCRIPTION_TYPES` deve incluir symbols para `ActivateSubscriptionUseCase`, `CancelSubscriptionUseCase`, `HandlePaymentFailedUseCase`, `StripeWebhookWorker`, `StripeWebhookEventRepository` e `PrismaStripeWebhookEventRepository`
- `subscription-module.ts` deve registrar todos os novos bindings: use cases, worker e repositório de eventos
- `SubscriptionRepositoryProvider` deve selecionar `PrismaSubscriptionRepository` em produção (ambiente `production`)
- `QUEUES` em `src/shared/infra/queue/queues.ts` deve incluir `STRIPE_WEBHOOK: "stripeWebhook"`
- A fila `stripeWebhook` deve ser configurada no setup de filas (`queue-setup.ts` ou equivalente)
- O bootstrap do módulo de subscription deve incluir o `StripeWebhookWorker` no array de workers iniciados
- `pnpm fit:validate-dependencies` deve passar sem violações

</requirements>

## Subtarefas

- [x] 7.1 Atualizar `src/shared/infra/ioc/module/service-identifier/subscription-types.ts` com os novos symbols
- [x] 7.2 Atualizar `src/shared/infra/ioc/module/subscription/subscription-module.ts` com os novos bindings
- [x] 7.3 Atualizar `src/shared/infra/ioc/module/subscription/subscription-repository-provider.ts` para selecionar `PrismaSubscriptionRepository` em produção
- [x] 7.4 Adicionar `STRIPE_WEBHOOK: "stripeWebhook"` em `src/shared/infra/queue/queues.ts`
- [x] 7.5 Configurar fila `stripeWebhook` no arquivo de setup de filas do RabbitMQ
- [x] 7.6 Atualizar bootstrap do módulo subscription para iniciar o `StripeWebhookWorker`
- [x] 7.7 Executar `pnpm fit:validate-dependencies` para validar regras de arquitetura
- [x] 7.8 Executar `pnpm build` para confirmar build completo sem erros
- [x] 7.9 Executar `pnpm test:run` e `pnpm test:business-flow` para confirmar que nenhum teste existente foi quebrado

## Detalhes de Implementação

Consultar seção **"Componentes modificados"** e **"Dependências Técnicas"** da `techspec.md` para a lista completa de arquivos e o que deve ser alterado em cada um.

Verificar `src/bootstrap/setup-subscription-module.ts` (ou equivalente) para entender como outros workers são inicializados — seguir o mesmo padrão.

Os bindings de use cases devem usar `.to(ClassName)` (Inversify cuida da instanciação). O repositório de eventos deve usar `.toDynamicValue()` se precisar de seleção por ambiente, ou `.to()` direto se só há uma implementação.

## Critérios de Sucesso

- Todos os symbols adicionados em `SUBSCRIPTION_TYPES`
- Todos os bindings registrados em `subscription-module.ts`
- `SubscriptionRepositoryProvider` seleciona `PrismaSubscriptionRepository` em produção
- `QUEUES.STRIPE_WEBHOOK` definido
- Fila `stripeWebhook` configurada no setup do RabbitMQ
- `pnpm fit:validate-dependencies` passa sem violações
- `pnpm build` passa sem erros
- `pnpm test:run` e `pnpm test:business-flow` passam sem regressões

## Testes da Tarefa

- [ ] Validação arquitetural: `pnpm fit:validate-dependencies` sem violações
- [ ] Build completo: `pnpm build` sem erros
- [ ] Testes regressivos: `pnpm test:run` + `pnpm test:business-flow` passam

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- `src/shared/infra/ioc/module/subscription/subscription-module.ts`
- `src/shared/infra/ioc/module/subscription/subscription-repository-provider.ts`
- `src/shared/infra/queue/queues.ts`
- `src/bootstrap/setup-subscription-module.ts` (ou equivalente)
- arquivo de setup de filas RabbitMQ (verificar localização no projeto)
