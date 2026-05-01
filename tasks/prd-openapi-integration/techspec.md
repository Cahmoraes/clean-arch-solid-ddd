# Tech Spec - Integração OpenAPI Completa

## Resumo Executivo

A solução adota a biblioteca `zod-openapi` para derivar schemas OpenAPI 3.0 diretamente dos schemas Zod v4 já existentes nos controllers, eliminando duplicação e garantindo sincronização automática entre validação e documentação. A abordagem se integra ao `@fastify/swagger` já configurado, mantém o padrão de factory function (`makeSwaggerSchema()`) em cada controller e adiciona: validação de response via hook em desenvolvimento, testes de contrato com `vitest-openapi`, e geração de client tipado com `openapi-typescript` + `openapi-fetch`.

A estratégia prioriza reutilização máxima (Zod como single source of truth), impacto mínimo na arquitetura existente (controllers mantêm sua estrutura) e extensibilidade futura (versionamento, novos domínios).

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Componentes novos:**

- `OpenApiSchemaBuilder` — utilitário que converte schemas Zod (com `.meta()`) em JSON Schema compatível com `@fastify/swagger`, encapsulando a chamada ao `zod-openapi`
- `ResponseValidationHook` — hook Fastify `onSend` que valida responses contra schemas em ambiente de desenvolvimento
- `ExportSpecScript` — script npm que inicializa o servidor, extrai a spec via `fastify.swagger()` e persiste como arquivo JSON estático
- Suite de testes de contrato — arquivos `*.contract-test.ts` que validam endpoints contra a spec exportada

**Componentes modificados:**

- `FastifySwaggerSetupFactory` — adicionar `securitySchemes` (Bearer JWT), tags completas (sessions, check-ins, subscriptions, health) e metadata da API
- `FastifySwaggerUISetupFactory` — configurar ordenação de tags
- `FastifyAdapter` — registrar `ResponseValidationHook` condicionalmente (env DEV)
- Todos os 17 controllers sem schema — adicionar factory function `makeSwaggerSchema()` derivada do Zod schema existente com `.meta()`
- `Schema` interface em `http-server.ts` — adicionar campo `security` para rotas protegidas

**Relacionamentos:**

- Controllers definem schemas Zod com `.meta()` → `OpenApiSchemaBuilder` transforma em JSON Schema → passado ao `httpServer.register()` → `@fastify/swagger` gera spec OpenAPI
- `ResponseValidationHook` consome a spec gerada internamente para validar responses em runtime (apenas DEV)
- Testes de contrato consomem spec exportada e validam responses reais via `vitest-openapi`

## Design de Implementação

### Interfaces Principais

```typescript
// src/shared/infra/openapi/openapi-schema-builder.ts
interface OpenApiSchemaBuilderInput {
  body?: z.ZodType
  querystring?: z.ZodType
  params?: z.ZodType
  responses: Record<number, { description: string; schema?: z.ZodType }>
  tags: string[]
  summary: string
  description?: string
  security?: boolean
}

interface OpenApiSchemaBuilderOutput extends Schema {
  tags: string[]
  summary: string
  description?: string
  body?: object
  querystring?: object
  params?: object
  response: Record<number, object>
  security?: Array<Record<string, string[]>>
}
```

```typescript
// src/shared/infra/server/hooks/response-validation-hook.ts
interface ResponseValidationHook {
  register(server: FastifyInstance): void
}
```

### Modelos de Dados

Não há novos modelos de domínio ou schemas de banco. Os tipos impactados são exclusivamente contratos HTTP (request/response shapes) já definidos via Zod nos controllers.

**Tipo Schema atualizado:**

```typescript
// src/shared/infra/server/http-server.ts
export interface Schema {
  tags?: string[]
  summary?: string
  description?: string
  body?: unknown
  querystring?: unknown
  params?: unknown
  headers?: unknown
  response?: unknown
  security?: Array<Record<string, string[]>>
}
```

### Endpoints de API

Nenhum endpoint novo de negócio. Endpoints afetados pela documentação:

| Domínio | Rota | Método | Tags | Autenticação |
|---------|------|--------|------|--------------|
| User | /users | POST | users | Não |
| User | /users | GET | users | Sim |
| User | /users/:userId | GET | users | Sim |
| User | /users/:userId | PATCH | users | Sim |
| User | /users/me | GET | users | Sim |
| User | /users/me/metrics | GET | users | Sim |
| User | /users/me/change-password | PATCH | users | Sim |
| User | /users/activate | PATCH | users | Sim |
| Gym | /gyms | POST | gyms | Sim (ADMIN) |
| Gym | /gyms/search/:name | GET | gyms | Sim |
| Check-in | /check-ins | POST | check-ins | Sim (ADMIN) |
| Check-in | /check-ins/metrics/:userId | GET | check-ins | Sim |
| Check-in | /check-ins/validate | POST | check-ins | Sim (ADMIN) |
| Session | /sessions | POST | sessions | Não |
| Session | /sessions/refresh | POST | sessions | Não |
| Session | /sessions/logout | POST | sessions | Sim |
| Subscription | /subscriptions | POST | subscriptions | Sim |
| Subscription | /webhook/stripe | POST | subscriptions | Não |
| Shared | /health | GET | health | Não |

**Endpoint de spec (já existente via plugin):** `GET /documentation/json`

## Pontos de Integração

### zod-openapi (samchungy/zod-openapi)

- **Propósito:** Converter schemas Zod v4 em JSON Schema OpenAPI-compatible
- **API utilizada:** `createSchema()` para conversão individual de schemas, `.meta()` em schemas Zod para metadata OpenAPI
- **Compatibilidade:** Suporta Zod v4 nativamente via `z.meta()`
- **Tratamento de erros:** Falhas de conversão são capturadas em build-time (schemas inválidos causam erro de compilação)

### vitest-openapi

- **Propósito:** Matchers customizados (`toSatisfyApiSpec()`) para testes de contrato
- **Integração:** Carrega spec JSON exportada uma única vez no setup dos testes
- **Compatibilidade:** Suporta OpenAPI 3.0, supertest responses

### openapi-typescript + openapi-fetch

- **Propósito:** Geração de tipos TypeScript e client HTTP tipado
- **Fluxo:** Script npm executa `npx openapi-typescript` → gera types `.d.ts` → `openapi-fetch` consome types
- **Saída:** `src/shared/infra/openapi/generated/api-types.d.ts`

## Abordagem de Testes

### Testes Unitários

- **OpenApiSchemaBuilder:** Testar conversão de schemas Zod com `.meta()` para JSON Schema válido
- **ResponseValidationHook:** Testar detecção de responses não-conformes e geração de warnings
- **Cenários críticos:** Schemas com enums, optional fields, arrays, nested objects, coerce

### Testes de Integração

- **Business-flow tests existentes:** Permanecem inalterados; validam comportamento funcional
- **Não há necessidade de novos testes de integração** além dos testes de contrato

### Testes de Contrato (nova suite)

- **Comando:** `npm run test:contract`
- **Configuração Vitest:** `test/vite.config.contract.ts`
- **Estratégia:**
  1. Script de setup exporta spec JSON via `fastify.swagger()` antes dos testes
  2. `vitestOpenAPI('path/to/spec.json')` carrega spec no setup global
  3. Cada teste faz request real (supertest) e asserta `expect(response).toSatisfyApiSpec()`
  4. Cobertura: todos os 19 endpoints com pelo menos sucesso + 1 cenário de erro

### Testes de E2E

Não aplicável para esta feature (sem frontend envolvido).

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Infraestrutura base** — Instalar dependências (`zod-openapi`, `vitest-openapi`, `openapi-typescript`, `openapi-fetch`), atualizar `FastifySwaggerSetupFactory` com securitySchemes e tags completas, atualizar interface `Schema`
2. **OpenApiSchemaBuilder** — Implementar utilitário de conversão Zod → JSON Schema, criar testes unitários
3. **Migrar controllers existentes com schema** — Refatorar `CreateUserController` e `CreateSubscriptionController` para usar `OpenApiSchemaBuilder` com schemas Zod + `.meta()`
4. **Documentar controllers por domínio** — Adicionar `makeSwaggerSchema()` nos 17 controllers restantes, seguindo ordem: User → Session → Gym → Check-in → Subscription → Shared
5. **ResponseValidationHook** — Implementar hook `onSend` para validação em DEV, registrar no `FastifyAdapter`
6. **Script de exportação** — Criar script npm para exportar spec como JSON estático
7. **Testes de contrato** — Configurar suite, implementar testes para todos os endpoints
8. **Client generation** — Configurar script npm para `openapi-typescript`, documentar uso com `openapi-fetch`

### Dependências Técnicas

- `zod-openapi` requer Zod v4+ (projeto já usa 4.3.6 — compatível)
- `vitest-openapi` requer spec válida exportada (depende de etapas 1-4)
- `openapi-typescript` requer arquivo spec JSON gerado (depende de etapa 6)
- `@fastify/swagger` já gerencia endpoint `/documentation/json` automaticamente

## Monitoramento e Observabilidade

- **Logs de validação (DEV):** `ResponseValidationHook` emite warnings via `Logger` existente quando response diverge do schema — nível `WARN`
- **Métricas:** Não há métricas novas a expor; a spec é documentação estática
- **Saúde:** Endpoint `/health` será documentado mas não alterado funcionalmente

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa | Alternativa Rejeitada |
|---------|---------------|----------------------|
| `zod-openapi` para conversão | Zod v4 é single source of truth; `.meta()` nativo sem monkey-patching | Schemas manuais JSON (duplicação, dessincronização) |
| Hook `onSend` para validação de response | Não impacta produção; feedback imediato em dev | Serialization nativa Fastify (faz coercion, não validação strict) |
| `vitest-openapi` para contract tests | Integra com stack existente (Vitest + supertest); matchers declarativos | Validação manual com AJV (mais verboso, menos ergonômico) |
| `openapi-typescript` + `openapi-fetch` | Types sem runtime overhead; fetch client leve | orval (mais pesado, features desnecessárias como React Query) |
| Manter factory function por controller | Consistência com padrão existente; schemas colocalizados com controller | Centralizar schemas em arquivo separado (dificulta navegação) |

### Riscos Conhecidos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| `zod-openapi` pode não suportar todos os tipos Zod usados (ex: `z.coerce`) | Schemas de conversão podem falhar | Testar conversão de cada schema existente na etapa 2; usar `.meta({ override })` para casos especiais |
| Divergência entre spec gerada e comportamento real após refatorações | Falsos positivos em contract tests | Contract tests no CI bloqueiam merge; coverage de 100% dos endpoints |
| Performance do hook de validação em DEV | Latência extra em requests durante desenvolvimento | Hook desativado em produção; validação lazy (não bloqueia response) |
| `vitest-openapi` compatibilidade com Vitest atual | Possível incompatibilidade de versão | Verificar compatibilidade antes da instalação; fallback para validação com AJV |

### Conformidade com Skills Padrões

- **zod** — Schemas Zod com `.meta()` para OpenAPI metadata seguem best practices de schema definition
- **test-antipatterns** — Testes de contrato validam comportamento real (não mocks); sem test-only code em produção
- **no-workarounds** — Conversão Zod → OpenAPI é solução de raiz (não workaround manual)
- **tdd** — OpenApiSchemaBuilder e ResponseValidationHook implementados com TDD (red-green-refactor)
- **typescript-advanced** — Types inferidos de Zod para garantir type-safety end-to-end

### Arquivos relevantes e dependentes

**Infraestrutura OpenAPI (modificar):**
- `src/shared/infra/server/factories/fastify-swagger-setup-factory.ts`
- `src/shared/infra/server/factories/fastify-swagger-ui-setup-factory.ts`
- `src/shared/infra/server/http-server.ts`
- `src/shared/infra/server/fastify-adapter.ts`

**Controllers (adicionar schema — 17 arquivos):**
- `src/user/infra/controller/fetch-users.controller.ts`
- `src/user/infra/controller/user-profile.controller.ts`
- `src/user/infra/controller/my-profile.controller.ts`
- `src/user/infra/controller/update-user-profile.controller.ts`
- `src/user/infra/controller/user-metrics.controller.ts`
- `src/user/infra/controller/change-password.controller.ts`
- `src/user/infra/controller/activate-user.controller.ts`
- `src/gym/infra/controller/create-gym.controller.ts`
- `src/gym/infra/controller/search-gym.controller.ts`
- `src/check-in/infra/controller/check-in.controller.ts`
- `src/check-in/infra/controller/validate-check-in.controller.ts`
- `src/check-in/infra/controller/metrics.controller.ts`
- `src/session/infra/controller/authenticate.controller.ts`
- `src/session/infra/controller/refresh-token.controller.ts`
- `src/session/infra/controller/logout.controller.ts`
- `src/subscription/infra/controller/stripe-webhook.controller.ts`
- `src/shared/infra/controller/health-check-controller.ts`

**Controllers existentes com schema (refatorar):**
- `src/user/infra/controller/create-user.controller.ts`
- `src/subscription/infra/controller/create-subscription.controller.ts`

**Novos arquivos a criar:**
- `src/shared/infra/openapi/openapi-schema-builder.ts`
- `src/shared/infra/openapi/openapi-schema-builder.test.ts`
- `src/shared/infra/server/hooks/response-validation-hook.ts`
- `src/shared/infra/server/hooks/response-validation-hook.test.ts`
- `test/vite.config.contract.ts`
- `test/contract/setup.ts`
- `test/contract/*.contract-test.ts` (por domínio)
- `scripts/export-openapi-spec.ts`
- `scripts/generate-client.ts`
- `src/shared/infra/openapi/generated/` (diretório para types gerados)

**Configuração:**
- `package.json` (novos scripts e dependências)
- `tsconfig.json` (incluir diretório generated)
