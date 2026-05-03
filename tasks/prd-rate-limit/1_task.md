# Tarefa 1.0: Configuração base — dependências, constantes, tipos e exchange

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Preparar toda a base necessária para o rate limiting: instalar o pacote `@fastify/rate-limit`, criar o arquivo de constantes de configuração, definir os tipos/interfaces auxiliares, estender o `HandlerOptions` com a opção `rateLimit` e adicionar o exchange `RATE_LIMIT_EXCEEDED` ao RabbitMQ.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — Todas as correções devem ser root-cause, sem hacks ou suppressões
- **`systematic-debugging`** — Usar para debugging de problemas durante implementação
- **`tdd`** — Recomendado para desenvolvimento dos testes unitários da configuração
</skills>

<requirements>

- Instalar `@fastify/rate-limit` como dependência do backend
- Criar arquivo `rate-limit-config.ts` com todas as constantes de configuração (limites, janelas, multiplicador admin, namespace Redis)
- Criar interface `RateLimitRouteConfig` para configuração per-route
- Estender `HandlerOptions` em `http-server.ts` com campo opcional `rateLimit`
- Adicionar exchange `RATE_LIMIT_EXCEEDED` ao objeto `EXCHANGES` em `exchanges.ts`
- Criar interface `RateLimitExceededEvent` para o payload do evento RabbitMQ
- Todos os testes existentes devem continuar passando

</requirements>

## Subtarefas

- [ ] 1.1 Instalar `@fastify/rate-limit` via `pnpm --filter backend add @fastify/rate-limit`
- [ ] 1.2 Criar `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts` com constantes de configuração (ver seção "Configuração de limites por grupo de rota" na techspec)
- [ ] 1.3 Criar interface `RateLimitRouteConfig` e `RateLimitExceededEvent` no arquivo de config ou em arquivo de tipos dedicado
- [ ] 1.4 Estender `HandlerOptions` em `http-server.ts` adicionando `rateLimit?: RateLimitRouteConfig | false`
- [ ] 1.5 Adicionar `RATE_LIMIT_EXCEEDED` ao objeto `EXCHANGES` em `exchanges.ts`
- [ ] 1.6 Escrever testes unitários para `rate-limit-config.ts` validando constantes (limites, janela, multiplicador)
- [ ] 1.7 Executar `tsc:check` para garantir que os tipos estão corretos

## Detalhes de Implementação

Referência principal: **techspec.md** — seções:
- "Interfaces Principais" — definição de `RateLimitRouteConfig` e extensão de `HandlerOptions`
- "Configuração de limites por grupo de rota" — tabela com valores de Max por grupo/role e janela
- "Modelos de Dados" — namespace Redis `rl:`, payload `RateLimitExceededEvent`
- "Pontos de Integração > RabbitMQ" — exchange `rateLimitExceeded`

**Constantes esperadas em `rate-limit-config.ts`:**
- Auth: max 20 (MEMBER), janela 15 min
- Geral: max 100 (MEMBER), janela 15 min
- Multiplicador admin: 3x (ADMIN recebe 60 em auth, 300 em geral)
- Namespace Redis: `rl:`

## Critérios de Sucesso

- `@fastify/rate-limit` aparece em `apps/backend/package.json` como dependência
- Arquivo `rate-limit-config.ts` exporta todas as constantes necessárias
- Interface `RateLimitRouteConfig` está definida e exportada
- `HandlerOptions` aceita campo `rateLimit` opcional
- Exchange `RATE_LIMIT_EXCEEDED` está registrado em `exchanges.ts`
- Testes unitários da config passam
- `tsc:check` passa sem erros
- Todos os testes existentes continuam passando (`test:run`)

## Testes da Tarefa

- [ ] Testes de unidade: `rate-limit-config.test.ts` — Validar que as constantes de configuração estão corretas (limites por grupo, janela de tempo, multiplicador admin, namespace Redis)
- [ ] Validação de tipos: `tsc:check` passa sem erros após alterações em `HandlerOptions` e `exchanges.ts`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Arquivos a criar:**
- `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts`
- `apps/backend/src/shared/infra/server/plugins/rate-limit-config.test.ts`

**Arquivos a modificar:**
- `apps/backend/package.json` — adicionar `@fastify/rate-limit`
- `apps/backend/src/shared/infra/server/http-server.ts` — estender `HandlerOptions`
- `apps/backend/src/shared/infra/queue/exchanges.ts` — adicionar exchange

**Arquivos de referência (leitura):**
- `apps/backend/src/shared/infra/server/fastify-adapter.ts` — entender estrutura de `HandlerOptions`
- `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts` — padrão de exchanges
- `apps/backend/src/shared/infra/env/index.ts` — variáveis de ambiente
