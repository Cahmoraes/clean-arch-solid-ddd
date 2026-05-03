# Tarefa 3.0: Integração no FastifyAdapter e registro de rotas

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Integrar o `RateLimitPlugin` ao `FastifyAdapter`, registrando-o durante a inicialização do servidor (antes do registro de rotas). Propagar a configuração `rateLimit` do `HandlerOptions` para o Fastify via `config.rateLimit` em cada rota. Aplicar overrides per-route nas rotas de autenticação com limites mais restritivos. Excluir rotas de infraestrutura (health check, webhook Stripe). Gerenciar o lifecycle da conexão Redis dedicada no shutdown do servidor.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — Todas as correções devem ser root-cause, sem hacks ou suppressões
- **`systematic-debugging`** — Usar para debugging de problemas durante implementação
- **`tdd`** — Recomendado para validar a integração incrementalmente
</skills>

<requirements>

- Chamar `RateLimitPlugin.register()` dentro de `FastifyAdapter.initialize()`, antes do registro de rotas
- Propagar `options.rateLimit` do `HandlerOptions` para `routeOptions.config.rateLimit` no método `register()` do `FastifyAdapter`
- Aplicar override de rate limit nas rotas de autenticação: `POST /sessions`, `PATCH /sessions/refresh`, `POST /users`, `PATCH /users/activate` com limite de 20 req/15min (MEMBER)
- Excluir rotas de infraestrutura do rate limiting: `GET /health`, `POST /webhook/stripe` (`rateLimit: false`)
- Encerrar conexão Redis dedicada no método `close()` do `FastifyAdapter`
- Não quebrar nenhuma rota existente — o rate limiting deve ser transparente
- Todos os testes existentes devem continuar passando

</requirements>

## Subtarefas

- [ ] 3.1 Modificar `FastifyAdapter.initialize()` para chamar `RateLimitPlugin.register()` antes do registro de rotas
- [ ] 3.2 Modificar `FastifyAdapter.register()` para propagar `options.rateLimit` via `config.rateLimit` do Fastify
- [ ] 3.3 Aplicar overrides de rate limit nos controllers das rotas de autenticação (session e user) conforme tabela da techspec
- [ ] 3.4 Aplicar `rateLimit: false` nas rotas de infraestrutura (health check, webhook Stripe)
- [ ] 3.5 Adicionar encerramento da conexão Redis dedicada no `FastifyAdapter.close()`
- [ ] 3.6 Executar `tsc:check` e `test:run` para validar que nada foi quebrado

## Detalhes de Implementação

Referência principal: **techspec.md** — seções:
- "Arquitetura do Sistema > Componentes modificados" — alterações no `FastifyAdapter` e `HandlerOptions`
- "Arquitetura do Sistema > Fluxo de dados" — sequência completa do request (JWT → rate limit → handler)
- "Endpoints de API > Configuração de limites por grupo de rota" — tabela com rotas, limites e grupos
- "Pontos de Integração > Redis" — lifecycle da conexão dedicada no shutdown
- "Pontos de Integração > Fastify — trustProxy" — consideração sobre `request.ip` atrás de proxy

**Rotas de autenticação (override com limite restritivo):**
- `POST /sessions` (login)
- `PATCH /sessions/refresh` (refresh token)
- `POST /users` (registro)
- `PATCH /users/activate` (ativação)

**Rotas excluídas (sem rate limiting):**
- `GET /health`
- `POST /webhook/stripe`

## Critérios de Sucesso

- Plugin é registrado com sucesso durante `initialize()` do FastifyAdapter
- Rotas de autenticação recebem override com limite de 20 req/15min (MEMBER) / 60 req/15min (ADMIN)
- Demais rotas usam limite global de 100 req/15min (MEMBER) / 300 req/15min (ADMIN)
- Rotas de infraestrutura não sofrem rate limiting
- Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset` são adicionados em todas as respostas (exceto rotas excluídas)
- Conexão Redis dedicada é encerrada corretamente no shutdown
- `tsc:check` passa sem erros
- Todos os testes existentes continuam passando (`test:run`)

## Testes da Tarefa

- [ ] Validação funcional: verificar manualmente (ou via testes de integração na Task 4.0) que o plugin está ativo
- [ ] Validação de regressão: `test:run` — todos os testes existentes passam (rate limit desabilitado em test com `max: Infinity`)
- [ ] Validação de tipos: `tsc:check` — sem erros de compilação

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Arquivos a modificar:**
- `apps/backend/src/shared/infra/server/fastify-adapter.ts` — registrar plugin em `initialize()`, propagar `config.rateLimit` em `register()`, encerrar Redis em `close()`
- `apps/backend/src/session/infra/controller/session.controller.ts` (ou equivalente) — aplicar override de rate limit nas rotas de auth
- `apps/backend/src/user/infra/controller/user.controller.ts` (ou equivalente) — aplicar override de rate limit nas rotas de registro/ativação
- Rotas de infraestrutura (health check, webhook Stripe) — aplicar `rateLimit: false`

**Arquivos de referência (leitura):**
- `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.ts` — módulo a ser registrado (criado na Task 2.0)
- `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts` — constantes (criado na Task 1.0)
- `apps/backend/src/shared/infra/server/http-server.ts` — interface `HandlerOptions` (modificado na Task 1.0)
- `apps/backend/src/session/infra/controller/routes/session-routes.ts` — rotas de sessão
- `apps/backend/src/user/infra/controller/routes/user-routes.ts` — rotas de usuário
- `apps/backend/src/shared/infra/server/global-error-handler.ts` — tratamento existente de HTTP 429
