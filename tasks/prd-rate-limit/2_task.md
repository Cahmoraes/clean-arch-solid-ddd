# Tarefa 2.0: Plugin de Rate Limiting (core)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o módulo `RateLimitPlugin` que encapsula toda a lógica central do rate limiting: configuração do `@fastify/rate-limit`, keyGenerator que diferencia IP de userId, função `max` dinâmica que aplica multiplicador por role (ADMIN 3x), callback `onExceeded` para log e publicação no RabbitMQ, conexão Redis dedicada com `skipOnError: true`, e desabilitação transparente em ambiente de testes via `max: Infinity`.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — Todas as correções devem ser root-cause, sem hacks ou suppressões
- **`systematic-debugging`** — Usar para debugging de problemas durante implementação
- **`tdd`** — Recomendado para desenvolvimento do plugin e seus testes unitários
</skills>

<requirements>

- Criar `rate-limit-plugin.ts` com método estático `register()` que configura o plugin na instância Fastify
- Implementar `keyGenerator`: retornar `request.ip` para rotas não autenticadas, `request.user.sub.id` para autenticadas
- Implementar `max` como função dinâmica: aplica multiplicador 3x quando `request.user.sub.role === 'ADMIN'`
- Implementar callback `onExceeded`: log via `Logger.warn()` com payload estruturado + publicação best-effort no RabbitMQ via `Queue.publish()`
- Criar conexão Redis dedicada (separada da `CacheDB`) usando mesmas variáveis de ambiente (`REDIS_HOST`, `REDIS_PORT`)
- Configurar `skipOnError: true` (fail-open) para não degradar disponibilidade se Redis cair
- Configurar `hook: 'preHandler'` para executar após autenticação JWT
- Quando `NODE_ENV=test`, registrar com `max: Infinity` para não interferir nos testes
- Testes unitários devem cobrir keyGenerator e max dinâmico isoladamente

</requirements>

## Subtarefas

- [ ] 2.1 Criar `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.ts` com a estrutura base do módulo
- [ ] 2.2 Implementar `keyGenerator` — lógica de identificação do requisitante (IP vs userId)
- [ ] 2.3 Implementar função `max` dinâmica — limites por role usando constantes de `rate-limit-config.ts`
- [ ] 2.4 Implementar callback `onExceeded` — log estruturado + publicação RabbitMQ best-effort
- [ ] 2.5 Configurar conexão Redis dedicada com `skipOnError: true` e lifecycle management
- [ ] 2.6 Implementar lógica de desabilitação em testes (`max: Infinity` quando `NODE_ENV=test`)
- [ ] 2.7 Escrever testes unitários em `rate-limit-plugin.test.ts`
- [ ] 2.8 Executar `tsc:check` e `test:run` para validar

## Detalhes de Implementação

Referência principal: **techspec.md** — seções:
- "Design de Implementação > Interfaces Principais" — assinatura de `keyGenerator` e `max`
- "Arquitetura do Sistema > Fluxo de dados" — ordem dos hooks (onRequest JWT → preHandler rate limit)
- "Pontos de Integração > Redis" — conexão dedicada, `skipOnError`, lifecycle
- "Pontos de Integração > RabbitMQ" — publicação best-effort via `Queue.publish()`
- "Considerações Técnicas > Decisões Principais" — justificativas para `preHandler`, `skipOnError`, `max: Infinity`

**Importante:** A Queue e o Logger devem ser obtidos do container IoC. O plugin recebe a instância Fastify e as dependências necessárias como parâmetros ou via closure no momento da configuração.

## Critérios de Sucesso

- Módulo `RateLimitPlugin` exporta método `register()` funcional
- `keyGenerator` retorna IP quando `request.user` é undefined, e `userId` quando autenticado
- Função `max` retorna limite correto para MEMBER e ADMIN (3x multiplicador)
- `onExceeded` loga via `Logger.warn()` com payload `{ ip, route, method, userId, role, timestamp }`
- `onExceeded` publica evento no exchange `RATE_LIMIT_EXCEEDED` (best-effort, sem propagar erros)
- Redis dedicado é criado com `skipOnError: true`
- Em `NODE_ENV=test`, `max` retorna `Infinity`
- Todos os testes unitários passam
- `tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade: `rate-limit-plugin.test.ts`
  - `keyGenerator` retorna IP quando não há usuário autenticado
  - `keyGenerator` retorna userId quando há usuário autenticado
  - Função `max` retorna limite MEMBER para usuários comuns
  - Função `max` retorna limite ADMIN (3x) para administradores
  - Função `max` retorna `Infinity` quando `NODE_ENV=test`
  - Callback `onExceeded` chama `Logger.warn()` com payload correto
  - Callback `onExceeded` chama `Queue.publish()` com exchange e payload corretos
  - Callback `onExceeded` não propaga erro se `Queue.publish()` falhar

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Arquivos a criar:**
- `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.ts`
- `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.test.ts`

**Arquivos de referência (leitura):**
- `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts` — constantes (criado na Task 1.0)
- `apps/backend/src/shared/infra/database/redis/redis-adapter.ts` — padrão de conexão Redis
- `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts` — padrão de publicação RabbitMQ
- `apps/backend/src/shared/infra/queue/exchanges.ts` — exchange `RATE_LIMIT_EXCEEDED`
- `apps/backend/src/shared/infra/env/index.ts` — variáveis de ambiente (`REDIS_HOST`, `REDIS_PORT`, `NODE_ENV`)
- `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts` — símbolos IoC para Queue e Logger
- `apps/backend/src/@types/custom.d.ts` — tipagem de `request.user` (sub.id, sub.role)
