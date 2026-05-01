# Tarefa 6.0: Documentar controllers de Subscription e Shared

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar schemas OpenAPI nos 2 controllers restantes: `StripeWebhookController` (Subscription) e `HealthCheckController` (Shared). Após esta tarefa, 100% dos endpoints estarão documentados.

<skills>
### Conformidade com Skills Padrões

- **zod** — Usar schemas Zod existentes com `.meta()` para documentação
- **no-workarounds** — Usar o builder, não schemas manuais
- **test-antipatterns** — Testes validam spec gerada, não implementação interna
</skills>

<requirements>
- Adicionar `makeSwaggerSchema()` no `StripeWebhookController` (tag: subscriptions, público)
- Adicionar `makeSwaggerSchema()` no `HealthCheckController` (tag: health, público)
- O webhook do Stripe recebe body raw — documentar como string/object conforme apropriado
- O health check retorna status simples — documentar response 200
- Após conclusão, verificar que todos os 19 endpoints estão documentados na spec
</requirements>

## Subtarefas

- [x] 6.1 Adicionar schema em `StripeWebhookController` (POST /webhook/stripe — público, body raw)
- [x] 6.2 Adicionar schema em `HealthCheckController` (GET /health — público)
- [x] 6.3 Verificar cobertura 100%: confirmar que todos os 19 endpoints aparecem em `/documentation/json`
- [x] 6.4 Executar `pnpm tsc:check`, `pnpm biome:fix` e `pnpm test:run`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Endpoints de API" — tabela com rotas
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 4

Nota especial para o webhook Stripe:
- O body pode ser documentado como `type: string` ou objeto genérico, pois é raw body verificado pelo Stripe
- A response deve documentar 200 (sucesso) e 400 (assinatura inválida)

## Critérios de Sucesso

- Ambos os controllers possuem `makeSwaggerSchema()` funcional
- `/documentation` exibe 100% dos endpoints (19/19)
- Spec JSON está completa com todos os endpoints documentados
- `pnpm tsc:check` e `pnpm test:run` passam a 100%
- `pnpm biome:fix` sem problemas

## Testes da Tarefa

- [x] Testes de unidade: Não necessários (cobertos pelo OpenApiSchemaBuilder tests)
- [x] Testes de integração: Executar testes existentes
- [x] Verificação manual: Contar endpoints em `/documentation/json` e confirmar 19/19

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/subscription/infra/controller/stripe-webhook.controller.ts`
- `src/shared/infra/controller/health-check-controller.ts`
- `src/shared/infra/openapi/openapi-schema-builder.ts`
