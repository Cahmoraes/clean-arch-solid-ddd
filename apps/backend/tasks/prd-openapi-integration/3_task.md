# Tarefa 3.0: Migrar controllers existentes com schema

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Refatorar os 2 controllers que já possuem schema OpenAPI (`CreateUserController` e `CreateSubscriptionController`) para usar o novo `OpenApiSchemaBuilder` com schemas Zod + `.meta()`. Isso valida que o builder funciona corretamente em controllers reais antes de expandir para os demais.

<skills>
### Conformidade com Skills Padrões

- **zod** — Adicionar `.meta()` aos schemas Zod existentes
- **no-workarounds** — Substituir schemas manuais por conversão automatizada
- **test-antipatterns** — Testes business-flow existentes devem continuar passando sem alteração
</skills>

<requirements>
- Refatorar `CreateUserController` para usar `OpenApiSchemaBuilder` no `makeSwaggerSchema()`
- Refatorar `CreateSubscriptionController` para usar `OpenApiSchemaBuilder` no `makeSwaggerSchema()`
- Manter o comportamento funcional idêntico ao anterior
- Schemas Zod existentes devem receber `.meta()` com metadata OpenAPI (description, examples)
- A spec gerada deve ser equivalente ou melhor que a atual
- Testes business-flow existentes devem continuar passando
</requirements>

## Subtarefas

- [x] 3.1 Identificar schemas Zod existentes em `CreateUserController` e adicionar `.meta()` com descriptions e examples
- [x] 3.2 Refatorar `makeSwaggerSchema()` do `CreateUserController` para usar `OpenApiSchemaBuilder`
- [x] 3.3 Identificar schemas Zod existentes em `CreateSubscriptionController` e adicionar `.meta()`
- [x] 3.4 Refatorar `makeSwaggerSchema()` do `CreateSubscriptionController` para usar `OpenApiSchemaBuilder`
- [x] 3.5 Verificar que `/documentation` exibe os endpoints refatorados corretamente
- [x] 3.6 Executar testes business-flow existentes para garantir não-regressão
- [x] 3.7 Verificar `pnpm tsc:check`, `pnpm biome:fix` e `pnpm test:run`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 3
- "Arquivos relevantes e dependentes > Controllers existentes com schema (refatorar)"
- "Considerações Técnicas > Decisões Principais" — manter factory function por controller

## Critérios de Sucesso

- Ambos os controllers usam `OpenApiSchemaBuilder` em vez de JSON Schema manual
- Spec gerada em `/documentation/json` contém os mesmos (ou melhores) schemas para esses endpoints
- Testes business-flow existentes passam sem alteração
- `pnpm tsc:check` e `pnpm test:run` passam a 100%

## Testes da Tarefa

- [ ] Testes de unidade: Não necessários (cobertos pelo OpenApiSchemaBuilder tests)
- [ ] Testes de integração: Executar business-flow tests existentes dos controllers refatorados
- [ ] Smoke test: Verificar spec JSON em `/documentation/json` para os 2 endpoints

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/user/infra/controller/create-user.controller.ts`
- `src/subscription/infra/controller/create-subscription.controller.ts`
- `src/shared/infra/openapi/openapi-schema-builder.ts`
