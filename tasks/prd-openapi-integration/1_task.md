# Tarefa 1.0: Infraestrutura base e dependências

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Instalar todas as dependências necessárias para a integração OpenAPI, atualizar a configuração do Swagger (securitySchemes, tags completas, metadata da API) e preparar a interface `Schema` para suportar os novos campos.

<skills>
### Conformidade com Skills Padrões

- **zod** — Validação de schemas Zod existentes continuam funcionando após mudanças
- **no-workarounds** — Não usar hacks para contornar incompatibilidades de versão
- **typescript-advanced** — Garantir tipagem correta na interface Schema atualizada
</skills>

<requirements>
- Instalar `zod-openapi` como dependência de produção
- Instalar `vitest-openapi`, `openapi-typescript`, `openapi-fetch` como dependências de desenvolvimento
- Atualizar `FastifySwaggerSetupFactory` com securitySchemes (Bearer JWT), tags completas e metadata
- Atualizar `FastifySwaggerUISetupFactory` com ordenação de tags
- Atualizar interface `Schema` em `http-server.ts` para incluir campos `security`, `tags`, `summary`, `description`
- Garantir que `/documentation` continua acessível e funcional
- Garantir que os 2 controllers já documentados continuam funcionando
</requirements>

## Subtarefas

- [ ] 1.1 Instalar dependências: `pnpm add zod-openapi` e `pnpm add -D vitest-openapi openapi-typescript openapi-fetch`
- [ ] 1.2 Atualizar `FastifySwaggerSetupFactory` — adicionar `securitySchemes` com Bearer JWT, adicionar todas as tags (users, sessions, gyms, check-ins, subscriptions, health) com descrições, adicionar metadata (title, description, version, contact)
- [ ] 1.3 Atualizar `FastifySwaggerUISetupFactory` — configurar ordenação lógica das tags
- [ ] 1.4 Atualizar interface `Schema` em `http-server.ts` — adicionar campos opcionais: `tags`, `summary`, `description`, `security`, `response`
- [ ] 1.5 Verificar que `/documentation` carrega corretamente com as novas tags e securitySchemes
- [ ] 1.6 Verificar que `pnpm tsc:check` e `pnpm build` passam sem erros

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Arquitetura do Sistema > Visão Geral dos Componentes" — componentes modificados
- "Design de Implementação > Modelos de Dados" — interface Schema atualizada
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 1
- "Arquivos relevantes e dependentes > Infraestrutura OpenAPI"

## Critérios de Sucesso

- Dependências instaladas e resolvidas sem conflitos
- `pnpm tsc:check` passa sem erros
- `pnpm build` compila com sucesso
- `/documentation` exibe Swagger UI com todas as tags e botão "Authorize"
- SecurityScheme Bearer JWT aparece na spec gerada
- Controllers existentes com schema continuam documentados corretamente

## Testes da Tarefa

- [ ] Testes de unidade: Não aplicável (configuração de infraestrutura)
- [ ] Testes de integração: Verificar que o servidor inicializa corretamente com as novas configurações
- [ ] Smoke test: Acessar `/documentation` e `/documentation/json` e verificar que a spec contém tags e securitySchemes

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `package.json`
- `src/shared/infra/server/factories/fastify-swagger-setup-factory.ts`
- `src/shared/infra/server/factories/fastify-swagger-ui-setup-factory.ts`
- `src/shared/infra/server/http-server.ts`
