# Tarefa 5.0: Implementar StripeWebhookWorker

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o consumer RabbitMQ que orquestra o processamento assíncrono dos eventos Stripe. O worker consome mensagens da fila `stripeWebhook`, abre uma transação, tenta registrar o evento na tabela de idempotência via insert-first, roteia pelo `event.type` para o use case correto e commita tudo atomicamente. Em caso de duplicata ou tipo não mapeado, faz ack silencioso. Em caso de falha transiente, faz rollback e ack para evitar loop infinito.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`**: ack sempre deve ser feito — nunca nack sem limite, pois causaria reprocessamento infinito
- **`tdd`**: escrever testes do worker antes da implementação — testar o roteamento e a lógica de idempotência em isolamento
- **`test-antipatterns`**: usar repositórios in-memory reais; não mockar a lógica de roteamento
- **`systematic-debugging`**: se houver falha de integração com RabbitMQ, diagnosticar configuração da fila antes de ajustar código
</skills>

<requirements>

- O worker deve consumir da fila `QUEUES.STRIPE_WEBHOOK`
- Deve abrir transação via `unitOfWork.runTransaction(tx)` antes de qualquer operação
- Deve chamar `stripeWebhookEventRepository.withTransaction(tx).markAsProcessed(eventId, eventType)` como primeira operação da transação
- Em caso de `DuplicateWebhookEventError`, deve fazer ack silencioso (log `info`) sem chamar nenhum use case
- O roteamento deve seguir: `customer.subscription.updated` (status `active`) → `ActivateSubscriptionUseCase`; `customer.subscription.updated` (status `canceled`) → `CancelSubscriptionUseCase`; `customer.subscription.deleted` → `CancelSubscriptionUseCase`; `invoice.payment_failed` → `HandlePaymentFailedUseCase`; outros tipos → ignorar silenciosamente
- Use cases devem ser chamados passando `tx` como segundo argumento
- Exceções nos use cases devem ser capturadas, logadas e o ack deve ser feito (tolerância a falhas)
- O worker deve ser decorado com `@injectable()` e receber dependências via `@inject()`

</requirements>

## Subtarefas

- [ ] 5.1 Escrever testes de unidade para o worker (red):
  - `customer.subscription.updated` status `active` → `ActivateSubscriptionUseCase` é chamado
  - `customer.subscription.deleted` → `CancelSubscriptionUseCase` é chamado
  - `invoice.payment_failed` → `HandlePaymentFailedUseCase` é chamado
  - tipo não mapeado → nenhum use case é chamado
  - `eventId` duplicado → use case NÃO é chamado
- [ ] 5.2 Criar `StripeWebhookWorker` em `src/subscription/infra/worker/stripe-webhook-worker.ts`
- [ ] 5.3 Implementar método `init()` com `queue.consume(QUEUES.STRIPE_WEBHOOK, handler)` e decorator `@Logger`
- [ ] 5.4 Implementar lógica de idempotência: insert-first, captura de `DuplicateWebhookEventError`
- [ ] 5.5 Implementar roteamento por `event.type` com `switch/case` ou mapa de handlers
- [ ] 5.6 Implementar tratamento de erros com log e ack garantido
- [ ] 5.7 Executar `pnpm test:run` — todos os testes do worker devem passar

## Detalhes de Implementação

Consultar seção **"Fluxo de dados"** (passos 4–9) e **"Cenários do worker"** em **"Abordagem de Testes"** da `techspec.md` para o comportamento exato esperado em cada cenário.

Verificar workers existentes no projeto (ex: em `src/*/infra/worker/`) para seguir o padrão de implementação de consumers RabbitMQ.

O payload da mensagem segue o tipo `StripeWebhookQueuePayload` definido na techspec:
```typescript
{ eventId: string; eventType: string; eventData: Stripe.Event }
```

## Critérios de Sucesso

- Worker implementado e decorado com `@injectable()`
- Todos os cenários de roteamento funcionam corretamente
- Idempotência: segundo processamento do mesmo `eventId` é ignorado
- Tolerância a falhas: exceção no use case não propaga para o broker
- Todos os testes de unidade passam (`pnpm test:run`)
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade — `stripe-webhook.worker.test.ts`:
  - roteamento correto para cada `event.type`
  - idempotência (duplicata não chama use case)
  - tipo desconhecido não chama nenhum use case
  - falha no use case não propaga exceção

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/subscription/infra/worker/stripe-webhook-worker.ts` (novo)
- `src/subscription/infra/worker/stripe-webhook.worker.test.ts` (novo)
