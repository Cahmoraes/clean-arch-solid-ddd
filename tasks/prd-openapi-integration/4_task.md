# Tarefa 4.0: Documentar controllers do domínio User

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar schemas OpenAPI completos nos 7 controllers restantes do domínio User utilizando o `OpenApiSchemaBuilder`. Cada controller deve ter um `makeSwaggerSchema()` documentando request body, params, query, responses (sucesso e erro) e requisitos de autenticação.

<skills>
### Conformidade com Skills Padrões

- **zod** — Usar schemas Zod existentes com `.meta()` para documentação
- **typescript-advanced** — Garantir tipagem correta nos schemas
- **no-workarounds** — Usar o builder, não schemas manuais
- **test-antipatterns** — Testes validam spec gerada, não implementação interna
</skills>

<requirements>
- Adicionar `makeSwaggerSchema()` em cada um dos 7 controllers restantes de User
- Cada schema deve incluir: tags (["users"]), summary, description, request/response schemas, security (para rotas protegidas)
- Responses devem incluir pelo menos: sucesso (200/201) e erros relevantes (400, 401, 404, 409)
- Cada response deve ter description e schema com example
- Endpoints protegidos devem ter `security: true`
- Endpoints ADMIN devem documentar restrição na description
</requirements>

## Subtarefas

- [x] 4.1 Adicionar schema em `FetchUsersController` (GET /users — protegido)
- [x] 4.2 Adicionar schema em `UserProfileController` (GET /users/:userId — protegido)
- [x] 4.3 Adicionar schema em `MyProfileController` (GET /users/me — protegido)
- [x] 4.4 Adicionar schema em `UpdateUserProfileController` (PATCH /users/:userId — protegido)
- [x] 4.5 Adicionar schema em `UserMetricsController` (GET /users/me/metrics — protegido)
- [x] 4.6 Adicionar schema em `ChangePasswordController` (PATCH /users/me/change-password — protegido)
- [x] 4.7 Adicionar schema em `ActivateUserController` (PATCH /users/activate — protegido)
- [x] 4.8 Verificar que `/documentation` exibe todos os endpoints de User corretamente
- [x] 4.9 Executar `pnpm tsc:check`, `pnpm biome:fix` e `pnpm test:run`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Endpoints de API" — tabela com rotas, métodos e requisitos de autenticação do domínio User
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 4

Para cada controller:
1. Identificar o schema Zod de validação existente (body/params/query)
2. Adicionar `.meta()` com descriptions e examples
3. Criar função `makeSwaggerSchema()` usando `OpenApiSchemaBuilder`
4. Passar o schema no `httpServer.register()`

## Critérios de Sucesso

- Todos os 7 controllers possuem `makeSwaggerSchema()` funcional
- `/documentation` exibe todos os endpoints de User com schemas completos
- Spec JSON contém request/response schemas para cada endpoint
- Endpoints protegidos mostram cadeado (security) no Swagger UI
- `pnpm tsc:check` e `pnpm test:run` passam a 100%
- `pnpm biome:fix` sem problemas

## Testes da Tarefa

- [ ] Testes de unidade: Não necessários (cobertos pelo OpenApiSchemaBuilder tests)
- [ ] Testes de integração: Executar business-flow tests existentes do domínio User
- [ ] Smoke test: Verificar spec JSON em `/documentation/json` para todos os endpoints de User

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/user/infra/controller/fetch-users.controller.ts`
- `src/user/infra/controller/user-profile.controller.ts`
- `src/user/infra/controller/my-profile.controller.ts`
- `src/user/infra/controller/update-user-profile.controller.ts`
- `src/user/infra/controller/user-metrics.controller.ts`
- `src/user/infra/controller/change-password.controller.ts`
- `src/user/infra/controller/activate-user.controller.ts`
- `src/shared/infra/openapi/openapi-schema-builder.ts`
