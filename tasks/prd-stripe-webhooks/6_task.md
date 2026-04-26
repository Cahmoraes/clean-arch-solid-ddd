# Tarefa 6.0: Completar StripeWebhookController

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Completar a implementação do `StripeWebhookController` que já existe no projeto mas está incompleto. O controller deve extrair o header `stripe-signature`, validar criptograficamente via `SubscriptionGateway.createEventWebhook()`, retornar `200` imediatamente após a validação e publicar o payload na fila `stripeWebhook`. Toda a lógica de negócio é processada de forma assíncrona pelo worker — o controller não deve aguardar o resultado.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`**: não usar `console.log` ou `return` vazio como solução final — implementar completamente
- **`tdd`**: escrever os testes business-flow antes de completar a implementação
- **`test-antipatterns`**: usar `stripe.webhooks.generateTestHeaderString()` para gerar assinaturas válidas nos testes — não mockar o SDK Stripe diretamente
</skills>

<requirements>

- O controller deve extrair `stripe-signature` do header da requisição
- Deve chamar `subscriptionGateway.createEventWebhook(rawBody, signature)` para validar
- Falha na validação (assinatura inválida ou ausente) → retornar `400`
- Validação bem-sucedida → retornar `200` imediatamente
- Após retornar `200`, publicar `{ eventId, eventType, eventData }` em `queue.publish(QUEUES.STRIPE_WEBHOOK, payload)` (sem await antes do return ou usando fire-and-publish seguro)
- O `rawBody` da requisição Fastify deve ser usado (já configurado no servidor)
- O arquivo vazio em `infra/webhook/` deve ser removido para evitar ambiguidade

</requirements>

## Subtarefas

- [ ] 6.1 Escrever testes business-flow para `StripeWebhookController` (red):
  - requisição sem `stripe-signature` → 400
  - requisição com assinatura inválida → 400
  - requisição com assinatura válida → 200
- [ ] 6.2 Completar implementação em `src/subscription/infra/controller/stripe-webhook.controller.ts`
  - extrair `stripe-signature` do header
  - chamar `createEventWebhook(rawBody, signature)`
  - capturar `Stripe.errors.StripeSignatureVerificationError` → retornar 400
  - retornar 200 e publicar na fila
- [ ] 6.3 Remover arquivo vazio de `src/subscription/infra/webhook/` (se existir)
- [ ] 6.4 Executar `pnpm test:business-flow -- --t "stripe"` e verificar que todos os testes passam
- [ ] 6.5 Verificar que `pnpm tsc:check` passa

## Detalhes de Implementação

Consultar seção **"Fluxo de dados"** (passos 1–3) e **"Testes de Integração — StripeWebhookController"** da `techspec.md`.

Para gerar assinatura válida nos testes usar:
```typescript
stripe.webhooks.generateTestHeaderString({
  payload: rawBody,
  secret: STRIPE_WEBHOOK_SECRET,
})
```

O controller deve seguir o padrão de todos os controllers do projeto: `@injectable()`, injetar via `@inject()`, implementar interface `Controller`, registrar rota no `init()`.

A resposta 200 e a publicação na fila devem ocorrer de forma que o Stripe receba o 200 sem esperar pelo processamento — verificar o padrão de outros controllers que publicam em fila para seguir a mesma abordagem.

## Critérios de Sucesso

- Requisição sem `stripe-signature` retorna `400`
- Requisição com assinatura inválida retorna `400`
- Requisição com assinatura válida retorna `200`
- Payload é publicado na fila após retorno do `200`
- Todos os testes business-flow passam
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de integração (business-flow) — `stripe-webhook.controller.business-flow-test.ts`:
  - sem `stripe-signature` → 400
  - assinatura inválida → 400
  - assinatura válida → 200

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/subscription/infra/controller/stripe-webhook.controller.ts`
- `src/subscription/infra/controller/stripe-webhook.controller.business-flow-test.ts` (novo)
- `src/subscription/infra/webhook/` (remover se existir arquivo vazio)
