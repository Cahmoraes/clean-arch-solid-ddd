# Tarefa 2.0: OpenApiSchemaBuilder

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o utilitário `OpenApiSchemaBuilder` que converte schemas Zod (com `.meta()`) em JSON Schema compatível com `@fastify/swagger`. Este componente é o coração da integração, servindo como ponte entre Zod (validação) e OpenAPI (documentação). Desenvolvimento com TDD (red-green-refactor).

<skills>
### Conformidade com Skills Padrões

- **tdd** — Implementar com ciclo red-green-refactor
- **zod** — Usar `.meta()` do Zod v4 para metadata OpenAPI
- **typescript-advanced** — Tipagem genérica para input/output do builder
- **no-workarounds** — Conversão real Zod → JSON Schema, sem hardcode manual
- **test-antipatterns** — Testes validam comportamento real de conversão, não mocks internos
</skills>

<requirements>
- Criar `src/shared/infra/openapi/openapi-schema-builder.ts`
- O builder deve aceitar schemas Zod para body, querystring, params e responses
- O builder deve aceitar metadata: tags, summary, description, security
- O builder deve retornar um objeto compatível com a interface `Schema` do Fastify
- Deve suportar schemas com: strings, numbers, booleans, enums, arrays, objetos aninhados, campos opcionais, z.coerce
- Deve gerar campo `security` como `[{ bearerAuth: [] }]` quando `security: true`
- Deve incluir examples nas responses quando fornecidos via `.meta()`
</requirements>

## Subtarefas

- [ ] 2.1 Criar arquivo de teste `src/shared/infra/openapi/openapi-schema-builder.test.ts` com casos de teste definidos (RED)
- [ ] 2.2 Implementar `OpenApiSchemaBuilder` com conversão básica de schemas Zod simples (GREEN)
- [ ] 2.3 Adicionar suporte a schemas complexos: enums, arrays, nested objects, optional fields
- [ ] 2.4 Adicionar suporte a `z.coerce` e tipos especiais
- [ ] 2.5 Adicionar suporte a metadata de responses (description, examples)
- [ ] 2.6 Adicionar geração de campo `security` para rotas protegidas
- [ ] 2.7 Refatorar código para clareza e manutenibilidade (REFACTOR)
- [ ] 2.8 Verificar que `pnpm tsc:check` e `pnpm test:run` passam

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Design de Implementação > Interfaces Principais" — interface `OpenApiSchemaBuilderInput` e `OpenApiSchemaBuilderOutput`
- "Pontos de Integração > zod-openapi" — API utilizada (`createSchema()`, `.meta()`)
- "Abordagem de Testes > Testes Unitários > OpenApiSchemaBuilder"

## Critérios de Sucesso

- Todos os testes unitários passam (cobertura de cenários críticos)
- Conversão correta de Zod → JSON Schema para todos os tipos usados no projeto
- Output é compatível com `@fastify/swagger` (formatos aceitos pelo Fastify)
- `pnpm tsc:check` passa sem erros
- `pnpm test:run` passa a 100%

## Testes da Tarefa

- [ ] Testes de unidade:
  - Conversão de z.object com campos string, number, boolean
  - Conversão de z.enum e z.nativeEnum
  - Conversão de z.array e objetos aninhados
  - Conversão de campos opcionais (z.optional)
  - Conversão de z.coerce.number, z.coerce.string
  - Geração de response schemas com descriptions
  - Geração de security para rotas protegidas
  - Geração de tags, summary e description
- [ ] Testes de integração: Não aplicável (utilitário puro sem dependências externas)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/shared/infra/openapi/openapi-schema-builder.ts` (criar)
- `src/shared/infra/openapi/openapi-schema-builder.test.ts` (criar)
- `src/shared/infra/server/http-server.ts` (interface Schema)
