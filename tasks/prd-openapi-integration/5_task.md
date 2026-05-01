# Tarefa 5.0: Documentar controllers dos domínios Session, Gym e Check-in

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar schemas OpenAPI completos nos 6 controllers dos domínios Session (3), Gym (2) e Check-in (3) utilizando o `OpenApiSchemaBuilder`. Cada controller deve ter um `makeSwaggerSchema()` documentando todos os contratos HTTP.

<skills>
### Conformidade com Skills Padrões

- **zod** — Usar schemas Zod existentes com `.meta()` para documentação
- **typescript-advanced** — Garantir tipagem correta nos schemas
- **no-workarounds** — Usar o builder, não schemas manuais
- **test-antipatterns** — Testes validam spec gerada, não implementação interna
</skills>

<requirements>
- Adicionar `makeSwaggerSchema()` em cada um dos 6 controllers
- Tags: sessions para Session, gyms para Gym, check-ins para Check-in
- Cada schema deve incluir: tags, summary, description, request/response schemas, security
- Responses devem incluir sucesso e erros relevantes com descriptions e examples
- Endpoints protegidos devem ter `security: true`
- Endpoints ADMIN (CreateGym, CheckIn, ValidateCheckIn) devem documentar restrição
</requirements>

## Subtarefas

- [ ] 5.1 Adicionar schema em `AuthenticateController` (POST /sessions — público)
- [ ] 5.2 Adicionar schema em `RefreshTokenController` (POST /sessions/refresh — público)
- [ ] 5.3 Adicionar schema em `LogoutController` (POST /sessions/logout — protegido)
- [ ] 5.4 Adicionar schema em `CreateGymController` (POST /gyms — protegido, ADMIN)
- [ ] 5.5 Adicionar schema em `SearchGymController` (GET /gyms/search/:name — protegido)
- [ ] 5.6 Adicionar schema em `CheckInController` (POST /check-ins — protegido, ADMIN)
- [ ] 5.7 Adicionar schema em `ValidateCheckInController` (POST /check-ins/validate — protegido, ADMIN)
- [ ] 5.8 Adicionar schema em `MetricsController` (GET /check-ins/metrics/:userId — protegido)
- [ ] 5.9 Verificar que `/documentation` exibe todos os endpoints desses domínios
- [ ] 5.10 Executar `pnpm tsc:check`, `pnpm biome:fix` e `pnpm test:run`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Endpoints de API" — tabela com rotas, métodos e requisitos de autenticação
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 4

Para cada controller:
1. Identificar o schema Zod de validação existente (body/params/query)
2. Adicionar `.meta()` com descriptions e examples
3. Criar função `makeSwaggerSchema()` usando `OpenApiSchemaBuilder`
4. Passar o schema no `httpServer.register()`

## Critérios de Sucesso

- Todos os 6 controllers possuem `makeSwaggerSchema()` funcional
- `/documentation` exibe todos os endpoints organizados por tags (sessions, gyms, check-ins)
- Spec JSON contém request/response schemas para cada endpoint
- Endpoints protegidos mostram security no Swagger UI
- `pnpm tsc:check` e `pnpm test:run` passam a 100%
- `pnpm biome:fix` sem problemas

## Testes da Tarefa

- [ ] Testes de unidade: Não necessários (cobertos pelo OpenApiSchemaBuilder tests)
- [ ] Testes de integração: Executar business-flow tests existentes dos domínios Session, Gym e Check-in
- [ ] Smoke test: Verificar spec JSON em `/documentation/json` para todos os endpoints

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/session/infra/controller/authenticate.controller.ts`
- `src/session/infra/controller/refresh-token.controller.ts`
- `src/session/infra/controller/logout.controller.ts`
- `src/gym/infra/controller/create-gym.controller.ts`
- `src/gym/infra/controller/search-gym.controller.ts`
- `src/check-in/infra/controller/check-in.controller.ts`
- `src/check-in/infra/controller/validate-check-in.controller.ts`
- `src/check-in/infra/controller/metrics.controller.ts`
- `src/shared/infra/openapi/openapi-schema-builder.ts`
