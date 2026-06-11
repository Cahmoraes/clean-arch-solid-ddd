# Especificação Técnica — Rate Limiting no Backend

## Resumo Executivo

A solução utiliza o plugin oficial `@fastify/rate-limit` registrado globalmente no `FastifyAdapter`, com Redis dedicado como store distribuído. O plugin será configurado com `hook: 'preHandler'` para que o rate limiting execute **após** a autenticação JWT, permitindo identificar o usuário e seu role antes de aplicar limites. Rotas de autenticação recebem overrides per-route via extensão do `HandlerOptions`. Rotas de infraestrutura (health check, webhook Stripe) são explicitamente excluídas. Em ambiente de testes (`NODE_ENV=test`), o plugin é registrado com `max: Infinity`, preservando a inicialização sem interferir nos testes. Bloqueios são logados e publicados no RabbitMQ de forma best-effort.

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Componentes novos:**

- **`RateLimitPlugin`** (`shared/infra/server/plugins/rate-limit-plugin.ts`) — Módulo responsável por registrar e configurar o `@fastify/rate-limit` na instância Fastify. Encapsula a lógica de keyGenerator, max dinâmico por role, callbacks de evento (`onExceeded`) e integração com Redis/RabbitMQ.
- **`RateLimitConfig`** (`shared/infra/server/plugins/rate-limit-config.ts`) — Constantes de configuração (limites, janelas de tempo, multiplicador admin, namespaces Redis).
- **`RATE_LIMIT_EXCEEDED` exchange** — Novo exchange no RabbitMQ para eventos de bloqueio.

**Componentes modificados:**

- **`FastifyAdapter`** — Chamará `RateLimitPlugin.register()` dentro de `initialize()`, antes do registro de rotas.
- **`HandlerOptions` / `HttpServer`** — Extensão da interface para aceitar configuração opcional de rate limit per-route (`rateLimit?: RateLimitRouteConfig | false`).
- **`EXCHANGES`** — Adição do exchange `RATE_LIMIT_EXCEEDED`.
- **`GlobalErrorHandler`** — Já trata HTTP 429; nenhuma alteração necessária, mas deve-se validar compatibilidade com a resposta do plugin.

**Fluxo de dados:**

1. Request chega ao Fastify
2. Hook `onRequest` executa autenticação JWT (quando `isProtected`)
3. Hook `preHandler` executa rate limiting (plugin `@fastify/rate-limit`)
4. Plugin consulta Redis para contagem do key (IP ou userId)
5. Se dentro do limite: request segue para o handler, headers de rate limit são adicionados à resposta
6. Se excedido: plugin retorna HTTP 429. Callback `onExceeded` loga e publica evento no RabbitMQ

## Design de Implementação

### Interfaces Principais

```typescript
// Configuração per-route passada via HandlerOptions
interface RateLimitRouteConfig {
  max?: number | ((request: FastifyRequest, key: string) => number)
  timeWindow?: string | number
}

// Extensão de HandlerOptions (http-server.ts)
interface HandlerOptions {
  callback: HandleCallback
  isProtected?: boolean
  onlyAdmin?: boolean
  rateLimit?: RateLimitRouteConfig | false // false = desabilita para esta rota
}
```

A interface `HttpServer` permanece inalterada na assinatura — o `rateLimit` é propagado internamente pelo `FastifyAdapter` via `config.rateLimit` do Fastify.

### Modelos de Dados

**Chaves Redis (gerenciadas pelo plugin):**

- Namespace: `rl:` (configurável via `nameSpace`)
- Formato: `rl:{key}` onde `key` é IP ou userId
- TTL: alinhado à `timeWindow` (15 minutos = 900s), gerenciado automaticamente pelo plugin

**Payload do evento RabbitMQ (`rateLimitExceeded`):**

```typescript
interface RateLimitExceededEvent {
  ip: string
  route: string
  method: string
  userId?: string
  role?: string
  timestamp: string
}
```

### Endpoints de API

Nenhum endpoint novo. O rate limiting é transparente e afeta todos os endpoints existentes via headers de resposta:

- `X-RateLimit-Limit` — Limite máximo da janela
- `X-RateLimit-Remaining` — Requisições restantes
- `X-RateLimit-Reset` — Timestamp de reset da janela (segundos)
- `Retry-After` — Presente apenas quando HTTP 429 é retornado

**Configuração de limites por grupo de rota:**

| Grupo | Rotas | Max (MEMBER) | Max (ADMIN) | Janela |
|-------|-------|:------------:|:-----------:|:------:|
| Auth  | `POST /sessions`, `PATCH /sessions/refresh`, `POST /users`, `PATCH /users/activate` | 20 | 60 | 15 min |
| Geral | Todas as demais | 100 | 300 | 15 min |
| Excluídas | `GET /health`, `POST /webhook/stripe` | — | — | — |

## Pontos de Integração

### Redis (ioredis)

- Conexão dedicada para rate limiting, independente da instância `CacheDB` do IoC
- Configuração: mesmo host/porta do `env.REDIS_HOST` e `env.REDIS_PORT`
- Opção `skipOnError: true` — política fail-open para não degradar disponibilidade se Redis cair
- Lifecycle: a instância deve ser encerrada no shutdown do servidor (`FastifyAdapter.close()`)

### RabbitMQ

- Novo exchange: `rateLimitExceeded` adicionado ao objeto `EXCHANGES`
- Publicação via `Queue.publish()` no callback `onExceeded` do plugin
- Best-effort: erros de publicação são capturados e logados sem propagar exceção
- A Queue é obtida do container IoC via closure no momento da configuração do plugin

### Fastify — trustProxy

- O `@fastify/rate-limit` usa `request.ip` por padrão para rotas não autenticadas
- Se o backend estiver atrás de proxy reverso (Nginx), `request.ip` pode retornar o IP do proxy
- Recomendação: configurar `trustProxy: true` na criação do Fastify se houver proxy. Este ponto deve ser validado na infraestrutura de deploy antes de ir para produção

## Abordagem de Testes

### Testes Unitários

- **`rate-limit-config.test.ts`**: Validar que as constantes de configuração estão corretas (limites, janela, multiplicador)
- **`rate-limit-plugin.test.ts`**: Testar a lógica do keyGenerator isoladamente (retorna IP quando sem user, retorna userId quando autenticado). Testar a função max dinâmica (retorna limite correto por role)

### Testes de Integração

- **`rate-limit.business-flow-test.ts`**: Testes HTTP com Fastify in-memory e limites finitos reduzidos (ex: `max: 3, timeWindow: '1 minute'`):
  - Requisições dentro do limite retornam 200 com headers `X-RateLimit-*`
  - Requisição que excede o limite retorna HTTP 429 com headers corretos
  - Rota de auth respeita limite diferenciado
  - Rota excluída (health check) não sofre rate limiting
  - Usuário autenticado usa userId como key (não IP)
  - Admin recebe limite multiplicado (3x)
- Para estes testes, o plugin será registrado com limites finitos pequenos via rebind ou configuração de teste dedicada, sobrescrevendo o `max: Infinity` padrão do ambiente de teste

### Testes de E2E

- Fora do escopo conforme PRD (testes de carga são responsabilidade da equipe de QA)
- Testes Playwright do frontend não são impactados pois o rate limiting é desabilitado em ambiente de teste

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Constantes e configuração** (`rate-limit-config.ts`, `EXCHANGES`) — Base sem dependências
2. **Extensão de interfaces** (`HandlerOptions.rateLimit`, tipos auxiliares) — Necessário antes da integração
3. **Plugin de rate limiting** (`rate-limit-plugin.ts`) — Lógica central com keyGenerator, max dinâmico e callbacks
4. **Integração no FastifyAdapter** — Registro do plugin em `initialize()` e propagação do `config.rateLimit` no `register()`
5. **Testes unitários** — Validação da configuração e lógica isolada
6. **Testes de integração** — Validação end-to-end HTTP com limites finitos
7. **Instalação e validação gate** — `pnpm add @fastify/rate-limit`, `biome:fix`, `tsc:check`, `test:run`, `build`

### Dependências Técnicas

- **`@fastify/rate-limit`**: Pacote npm a ser instalado (compatibilidade com Fastify 5.x deve ser verificada)
- **Redis**: Já disponível via Docker Compose (`docker:up`); nenhuma infraestrutura nova
- **RabbitMQ**: Já disponível; apenas adição de exchange

## Monitoramento e Observabilidade

- **Logs**: Cada bloqueio será logado via `Logger.warn()` com payload estruturado: `{ ip, route, method, userId, role, timestamp }`
- **Eventos RabbitMQ**: Exchange `rateLimitExceeded` permite consumers externos (alertas, dashboards, SIEM)
- **Headers HTTP**: Permitem que clientes monitorem seu próprio consumo de quota em tempo real
- **Métricas futuras**: A estrutura permite adicionar métricas Prometheus (contadores de bloqueio por rota/role) sem alterações arquiteturais. Fora do escopo atual

## Considerações Técnicas

### Decisões Principais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Plugin vs implementação custom | `@fastify/rate-limit` | Plugin oficial, mantido pelo time Fastify, suporte nativo a Redis, headers RFC, per-route config. Evita reinventar a roda |
| Hook do plugin | `preHandler` | Garante que `request.user` já foi populado pela autenticação JWT (`onRequest`), permitindo keyGenerator baseado em userId/role |
| Redis dedicado | Conexão separada | Isola o rate limiting do cache da aplicação, evitando impacto mútuo em caso de problemas. Permite configurações de retry diferentes |
| Fail-open (`skipOnError`) | `true` | Prioriza disponibilidade: se Redis cair, requests passam sem rate limiting. Preferível a bloquear todos os usuários |
| Desabilitação em testes | `max: Infinity` | Mantém o plugin registrado (código exercitado), mas sem efeito prático nos testes. Permite testes dedicados com overrides finitos |
| Multiplicador admin | 3x | Limites 3 vezes maiores para ADMIN, aplicados via `max` como função que inspeciona `request.user.sub.role` |

### Riscos Conhecidos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Plugin incompatível com Fastify 5.x | Bloqueante | Verificar compatibilidade na instalação; plugin oficial costuma acompanhar major releases |
| `request.ip` retorna IP do proxy | Todos os clientes compartilham mesmo rate limit | Documentar necessidade de `trustProxy: true` quando atrás de proxy reverso |
| Pico de publicações RabbitMQ durante ataque | Sobrecarga na fila | Publicação best-effort com try/catch; considerar sampling se necessário no futuro |
| Overhead acima de 5ms | Degradação de performance | O plugin com Redis adiciona ~1-3ms tipicamente; monitorar em produção |

### Conformidade com Skills Padrões

- **`no-workarounds`**: Aplicável — todas as correções devem ser root-cause, sem hacks ou suppressões
- **`systematic-debugging`**: Aplicável — usar para debugging de problemas durante implementação
- **`tdd`**: Recomendado para desenvolvimento dos testes de rate limiting
- **`react`** / **`shadcn`** / **`tailwindcss`**: Não aplicável (escopo exclusivamente backend)

### Arquivos relevantes e dependentes

**Arquivos a criar:**
- `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.ts`
- `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts`
- `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.test.ts`
- `apps/backend/src/shared/infra/server/plugins/rate-limit.business-flow-test.ts`

**Arquivos a modificar:**
- `apps/backend/src/shared/infra/server/http-server.ts` — Adicionar `rateLimit` ao `HandlerOptions`
- `apps/backend/src/shared/infra/server/fastify-adapter.ts` — Registrar plugin e propagar `config.rateLimit`
- `apps/backend/src/shared/infra/queue/exchanges.ts` — Adicionar `RATE_LIMIT_EXCEEDED`
- `apps/backend/package.json` — Adicionar dependência `@fastify/rate-limit`

**Arquivos de referência (leitura):**
- `apps/backend/src/shared/infra/database/redis/redis-adapter.ts` — Padrão de conexão Redis
- `apps/backend/src/shared/infra/database/redis/cache-db.ts` — Interface CacheDB
- `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts` — Padrão de publicação RabbitMQ
- `apps/backend/src/shared/infra/server/global-error-handler.ts` — Tratamento existente de 429
- `apps/backend/src/shared/infra/env/index.ts` — Variáveis de ambiente e helpers
- `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts` — Símbolos IoC
- `apps/backend/src/session/infra/controller/routes/session-routes.ts` — Rotas de sessão
- `apps/backend/src/user/infra/controller/routes/user-routes.ts` — Rotas de usuário
- `apps/backend/src/@types/custom.d.ts` — Tipagem do request.user
