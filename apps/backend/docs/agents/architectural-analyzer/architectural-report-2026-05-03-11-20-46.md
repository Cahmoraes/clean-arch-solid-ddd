# Relatorio de Analise Arquitetural

**Data**: 2026-05-03
**Modo**: Auditoria Completa
**Arquivos Analisados**: 254 arquivos de producao (327 total com testes)
**Total de Linhas de Producao**: ~25.046

---

## 1 -- Resumo Executivo

O backend e uma API Fastify construida com Clean Architecture + DDD, utilizando TypeScript com Inversify IoC e Prisma ORM. O projeto esta organizado em 6 bounded contexts (user, gym, check-in, session, subscription, shared) com separacao rigorosa de camadas domain/application/infra.

- **Codigo Morto**: 3 exports de tipos nunca importados (~20 linhas), 2 blocos de codigo comentado
- **Funcionalidade Duplicada**: 6 grupos de duplicacao identificados, ~200+ linhas duplicadas em controllers, value objects e repositories
- **Anti-Padroes Arquiteturais**: 2 god objects identificados (User entity 279 linhas, FastifyAdapter 284 linhas); 4 use cases com dependencias excessivas de infraestrutura
- **Problemas de Tipagem**: ~30 usos de `any` em codigo de producao, 9 double casts (`as unknown as`), 10+ supressoes de linter
- **Code Smells**: 1 funcao longa (CheckInUseCase.execute com 94 linhas), magic numbers em calculos de distancia, inconsistencia de localizacao de interfaces de repositorio

**Saude Geral**: O codebase apresenta maturidade arquitetural acima da media. A separacao de camadas e rigorosamente respeitada (zero violacoes de domain e application layers). O padrao Either e consistentemente aplicado. Os principais pontos de atencao sao: duplicacao de padroes em controllers/value objects, configuracao de seguranca permissiva (CORS, bcrypt salt), e ausencia de rate limiting.

---

## 2 -- Visao Geral do Sistema

### Stack Tecnologica

- **Runtime**: Node.js 22.20.0
- **Framework HTTP**: Fastify 5.8.5
- **Linguagem**: TypeScript 6.0.3 (strict mode)
- **ORM**: Prisma 7.8.0 (PostgreSQL + SQLite fallback)
- **IoC Container**: Inversify 8.1.0
- **Validacao**: Zod 4.3.6
- **Cache**: Redis (ioredis 5.10.1) com fallback para in-memory
- **Fila de Mensagens**: RabbitMQ (amqplib 1.0.3) + BullMQ 5.76.2
- **Autenticacao**: JWT (jsonwebtoken 9.0.3) + bcryptjs 3.0.3
- **Pagamentos**: Stripe 22.1.0
- **Email**: Nodemailer 8.0.6
- **Logging**: Winston 3.19.0
- **Build**: tsup 8.5.1
- **Testes**: Vitest 4.1.5 + Supertest 7.2.2
- **Linter**: Biome 2.4.13
- **Validacao Arquitetural**: dependency-cruiser 17.3.10 + archunit 2.1.69

### Padrao Arquitetural

Clean Architecture com DDD (Domain-Driven Design), organizado em bounded contexts com tres camadas por contexto:
- **domain/**: Entidades, Value Objects, Domain Events, erros de negocio (pura, sem dependencias externas)
- **application/**: Use Cases, interfaces de Repository, DTOs, erros de aplicacao (importa apenas domain)
- **infra/**: Controllers, Repositories concretos, Providers (importa application e domain)

### Bounded Contexts e Subdominios (DDD)

| Bounded Context | Subdominio | Classificacao |
| --------------- | ---------- | ------------- |
| User | Gestao de usuarios, perfis, roles, status | Core |
| Check-In | Registro de presenca em academias | Core |
| Gym | Cadastro e busca de academias | Supporting |
| Session | Autenticacao, logout, refresh token | Supporting |
| Subscription | Assinaturas, pagamentos via Stripe | Core |
| Shared | Infraestrutura transversal, base classes DDD | Generic |

### Estrutura de Diretorios

```
apps/backend/
  src/
    user/
      domain/           # Entidade User, VOs (Email, Name, Password, Phone, Role, Status)
      application/      # Use Cases, interfaces de repositorio, DTOs
      infra/            # Controllers, rotas HTTP
    gym/
      domain/           # Entidade Gym, VO (CNPJ)
      application/      # Use Cases (create, search, fetch-nearby)
      infra/            # Controllers, rotas
    check-in/
      domain/           # Entidade CheckIn, VOs (Coordinate, Distance), Specifications
      application/      # Use Cases (check-in, validate, history)
      infra/            # Controllers, rotas
    session/
      application/      # Use Cases (authenticate, logout, refresh)
      infra/            # Controllers
    subscription/
      domain/           # Entidade Subscription, VOs (Status)
      application/      # Use Cases (create, activate, cancel, handle-payment)
      infra/            # Controllers, Workers (Stripe webhook)
    shared/
      domain/           # Base classes (Entity, ValueObject, Either, DomainEvent)
      infra/            # IoC, Server, Database, Cache, Queue, Auth, Logger, Gateway
    bootstrap/          # Inicializacao e wiring de modulos
    @types/             # Declaracoes de tipo customizadas
  test/                 # Configuracoes de teste, factories, helpers
  prisma/               # Schema e migracoes do banco
  database/             # Scripts de migracao/seed
  nginx/                # Configuracao de proxy reverso
```

---

## 3 -- Metricas de Tamanho

| Metrica | Valor |
| ------- | ----- |
| Total de arquivos de codigo-fonte | 327 |
| Arquivos de producao (excluindo testes) | 254 |
| Arquivos de teste | 73 (src/) + 26 (test/) = 99 |
| Linhas de codigo total (src/) | ~32.249 |
| Linhas de codigo de producao | ~25.046 |
| Linhas de codigo de testes | ~8.423 |
| Ratio testes/producao | ~33% |

### Breakdown por Bounded Context

| Bounded Context | Arquivos | Linhas | Domain | Application | Infra |
| --------------- | -------- | ------ | ------ | ----------- | ----- |
| user/ | 42 | 4.270 | 14 (677) | 19 (664) | 9 (921) |
| check-in/ | 23 | 2.593 | 11 (390) | 7 (394) | 5 (533) |
| subscription/ | 19 | 2.527 | 3 (130) | 8 (351) | 5 (494) |
| gym/ | 13 | 1.514 | 3 (258) | 7 (207) | 3 (304) |
| session/ | 8 | 1.041 | 0 (0) | 4 (166) | 4 (422) |
| shared/ | 138 | 20.281 | 12 (339) | 0 (0) | 126 (18.705) |

### Breakdown por Tipo de Arquivo

| Tipo | Arquivos | Linhas |
| ---- | -------- | ------ |
| Controllers (*.controller.ts) | 19 | 2.380 |
| Use Cases (*.usecase.ts) | 23 | 1.524 |
| Testes de unidade (*.test.ts) | 53 | 5.061 |
| Business flow tests (*.business-flow-test.ts) | 20 | 2.142 |
| Infraestrutura (shared/infra/) | 126 | 18.705 |

---

## 4 -- Analise de Componentes Criticos

O acoplamento de um componente e medido em duas direcoes:

- **Acoplamento Aferente (Ca)**: numero de componentes externos que dependem deste componente (dependencias de entrada). Um Ca alto indica componente amplamente utilizado e com alto impacto em caso de mudancas.
- **Acoplamento Eferente (Ce)**: numero de componentes externos dos quais este componente depende (dependencias de saida). Um Ce alto indica componente fragil, dificil de reutilizar e sensivel a mudancas externas.
- **Instabilidade (I = Ce / (Ca + Ce))**: valor de 0 (estavel) a 1 (instavel). Componentes com I proximo de 0 sao dificeis de mudar; com I proximo de 1 sao faceis de mudar mas sensiveis a mudancas externas.

| Componente | Tipo | Localizacao | Ca | Ce | I | Papel Arquitetural |
| ---------- | ---- | ----------- | -- | -- | - | ------------------ |
| shared/infra/ioc/types | IoC Symbols | src/shared/infra/ioc/module/service-identifier/ | 93 | 0 | 0.00 | Identificadores centrais de DI |
| shared/infra/ioc/container | IoC Container | src/shared/infra/ioc/container.ts | 48 | 7 | 0.13 | Orquestrador de dependencias |
| shared/infra/env | Configuracao | src/shared/infra/env/index.ts | 35 | 2 | 0.05 | Validacao de variaveis de ambiente |
| shared/infra/server/http-status | Constantes HTTP | src/shared/infra/server/http-status.ts | 27 | 0 | 0.00 | Codigos de status HTTP |
| shared/infra/server/fastify-adapter | HTTP Server | src/shared/infra/server/fastify-adapter.ts | 22 | 12 | 0.35 | Adaptador do servidor HTTP |
| shared/domain/either | Either Pattern | src/shared/domain/either.ts | 40+ | 0 | 0.00 | Tratamento funcional de erros |
| shared/domain/value-object/id | Value Object | src/shared/domain/value-object/id.ts | 20+ | 1 | 0.05 | Identificador de entidades |
| user/domain/user | Entidade | src/user/domain/user.ts | 15 | 8 | 0.35 | Entidade principal do dominio |
| shared/infra/database/redis/redis-adapter | Cache | src/shared/infra/database/redis/redis-adapter.ts | 8 | 4 | 0.33 | Cache distribuido com fallback |
| bootstrap/server-build | Bootstrap | src/bootstrap/server-build.ts | 1 | 12 | 0.92 | Ponto de entrada da aplicacao |

---

## 5 -- Mapeamento de Dependencias

### Dependencias de Alto Nivel

```
Bootstrap (server-build.ts)
  |-> FastifyAdapter (HTTP Server)
  |-> IoC Container
  |    |-> UserModule -> UserRepository, UseCases, Controllers
  |    |-> GymModule -> GymRepository, UseCases, Controllers
  |    |-> CheckInModule -> CheckInRepository, UseCases, Controllers
  |    |-> SessionModule -> RevokedTokenDAO, UseCases, Controllers
  |    |-> SubscriptionModule -> SubscriptionGateway, Repositories, UseCases, Controllers, Workers
  |    |-> InfraModule -> Prisma, Redis, Queue, Logger, Mailer, CronJob
  |    |-> HealthCheckModule -> HealthCheckController
  |-> QueueController (consumers de eventos)
```

### Dependencias Entre Bounded Contexts

```
GYM --importa--> USER (Name, Phone value objects)
GYM --importa--> CHECK-IN (Coordinate value object, erros de latitude/longitude)
CHECK-IN --importa--> GYM (GymRepository, Gym entity, erros)
SESSION --importa--> USER (UserRepository, User entity, AuthToken)
SUBSCRIPTION --importa--> USER (User entity — apenas em testes)
```

### Ciclos de Dependencia

Nenhuma dependencia circular detectada entre bounded contexts em codigo de producao. O acoplamento GYM <-> CHECK-IN e unidirecional em cada caso: GYM importa value objects do CHECK-IN, enquanto CHECK-IN importa o repositorio/entidade de GYM.

---

## 6 -- Pontos de Integracao

| Integracao | Tipo | Localizacao | Proposito | Nivel de Risco |
| ---------- | ---- | ----------- | --------- | -------------- |
| Stripe API | Gateway de Pagamento | src/shared/infra/gateway/stripe-subscription-gateway.ts | Criacao de clientes, assinaturas, verificacao de webhooks | Critico |
| PostgreSQL | Banco de Dados Primario | prisma/schema.prisma, src/shared/infra/database/connection/prisma-client.ts | Armazenamento persistente de dados | Critico |
| Redis | Cache Distribuido | src/shared/infra/database/redis/redis-adapter.ts | Cache, tokens revogados, BullMQ backend | Alto |
| RabbitMQ | Fila de Mensagens | src/shared/infra/queue/rabbitmq-adapter.ts | Publicacao de eventos de dominio, processamento assincrono | Alto |
| BullMQ | Fila de Jobs | src/shared/infra/queue/bullmq-adapter.ts | Processamento de webhooks Stripe, workers em background | Alto |
| SQLite | Banco de Dados Fallback | src/shared/infra/database/connection/sqlite-connection.ts | Ambiente de desenvolvimento/teste | Baixo |
| Nodemailer | Email | src/shared/infra/gateway/node-mailer-adapter.ts | Envio de emails (registro, ativacao) | Medio |
| node-cron | Agendamento | src/shared/infra/cron/node-cron-adapter.ts | Atualizacao periodica de cache | Baixo |

---

## 7 -- Riscos Arquiteturais e Pontos Unicos de Falha

| Nivel de Risco | Componente | Problema | Impacto | Detalhes |
| -------------- | ---------- | -------- | ------- | -------- |
| Critico | CORS | `origin: true` permite todas as origens com credentials | Seguranca | Qualquer site pode fazer requisicoes autenticadas a API |
| Critico | Rate Limiting | Nenhum rate limiting configurado | Seguranca/Disponibilidade | Vulneravel a ataques de forca bruta em endpoints de autenticacao |
| Alto | bcrypt Salt | PASSWORD_SALT=2 como default | Seguranca | Salt rounds muito baixo para producao (recomendado: 10-12) |
| Alto | Stripe Gateway | Ponto unico de falha para pagamentos | Negocio | Toda logica de assinatura depende de um unico gateway sem circuit breaker ativo |
| Alto | PostgreSQL | Unica instancia de banco sem failover documentado | Disponibilidade | Sem evidencia de replicas ou failover automatico |
| Medio | Redis | Fallback para in-memory em caso de falha | Consistencia | Tokens revogados podem ser perdidos em restart se Redis estiver indisponivel |
| Medio | Error Logging | Global error handler loga objetos completos de erro | Seguranca | Stack traces podem expor caminhos internos e detalhes de implementacao |

---

## 8 -- Variaveis de Ambiente

As variaveis sao validadas em runtime via Zod em `src/shared/infra/env/index.ts`.

| Variavel | Descricao | Usado Em | Escopo | Ativa | Nivel de Risco |
| -------- | --------- | -------- | ------ | ----- | -------------- |
| `NODE_ENV` | Ambiente de execucao (test/production) | env/index.ts, response-validation-hook.ts | Todos | Sim | Medio |
| `PORT` | Porta HTTP do servidor | fastify-adapter.ts | Todos | Sim | Baixo |
| `HOST` | Host do servidor | fastify-adapter.ts | Todos | Sim | Baixo |
| `PASSWORD_SALT` | Salt rounds do bcrypt | user/domain/value-object/password.ts | Todos | Sim | Alto |
| `PRIVATE_KEY` | Chave secreta JWT | authenticate-pre-handler.ts, authenticate.usecase.ts | Todos | Sim | Critico |
| `JWT_EXPIRES_IN` | Expiracao do access token | json-web-token-adapter.ts | Todos | Sim | Medio |
| `JWT_REFRESH_EXPIRES_IN` | Expiracao do refresh token | json-web-token-adapter.ts | Todos | Sim | Medio |
| `REFRESH_TOKEN_NAME` | Nome do cookie de refresh | Nao encontrado em src/ | -- | Possivelmente Obsoleta | Baixo |
| `ITEMS_PER_PAGE` | Itens por pagina de listagem | Nao encontrado em src/ | -- | Possivelmente Obsoleta | Baixo |
| `CHECK_IN_EXPIRATION_TIME` | Tempo de expiracao de check-in | Nao encontrado em src/ | -- | Possivelmente Obsoleta | Baixo |
| `AMQP_URL` | URL de conexao RabbitMQ | rabbitmq-adapter.ts | Production | Sim | Alto |
| `DATABASE_URL` | String de conexao PostgreSQL | Prisma ORM | Todos | Sim | Critico |
| `DIRECT_URL` | URL direta do banco (failover) | Prisma config | Production | Sim | Alto |
| `DATABASE_PROVIDER` | Provider de banco (sqlite/prisma) | Repository providers | Todos | Sim | Medio |
| `REDIS_HOST` | Host do Redis | redis-adapter.ts, bullmq-adapter.ts | Production | Sim | Medio |
| `REDIS_PORT` | Porta do Redis | redis-adapter.ts, bullmq-adapter.ts | Production | Sim | Medio |
| `TTL` | Time-to-live do cache | Nao encontrado em src/ | -- | Possivelmente Obsoleta | Baixo |
| `CRON_TIME_TO_UPDATE_CACHE` | Intervalo do cron de cache | node-cron-adapter (inferido) | Production | Sim | Baixo |
| `STRIPE_PUBLIC_KEY` | Chave publica Stripe | Nao encontrado em src/ | -- | Possivelmente Obsoleta | Medio |
| `STRIPE_PRIVATE_KEY` | Chave privada Stripe | stripe-subscription-gateway.ts | Production | Sim | Critico |
| `STRIPE_PRICE_ID` | ID do preco Stripe | Nao encontrado em src/ | -- | Possivelmente Obsoleta | Medio |
| `STRIPE_WEBHOOK_SECRET` | Segredo de webhook Stripe | stripe-subscription-gateway.ts | Production | Sim | Critico |

**Nota**: 6 variaveis possivelmente obsoletas identificadas: `REFRESH_TOKEN_NAME`, `ITEMS_PER_PAGE`, `CHECK_IN_EXPIRATION_TIME`, `TTL`, `STRIPE_PUBLIC_KEY`, `STRIPE_PRICE_ID`. Recomenda-se verificar se sao acessadas indiretamente ou podem ser removidas do schema.

---

## 9 -- Avaliacao da Stack Tecnologica

### Backend

| Tecnologia | Versao | Relevancia Arquitetural |
| ---------- | ------ | ----------------------- |
| Node.js | 22.20.0 | Runtime LTS, suporte a ESM nativo |
| Fastify | 5.8.5 | Framework HTTP de alta performance |
| TypeScript | 6.0.3 | Strict mode ativo, decorators experimentais para Inversify |
| Prisma | 7.8.0 | ORM type-safe com migracao e geracao de client |
| Inversify | 8.1.0 | IoC container com decorators, binding por symbols |
| Zod | 4.3.6 | Validacao de schema em runtime (env, request, response) |

### Infraestrutura

| Tecnologia | Versao/Config | Relevancia |
| ---------- | ------------- | ---------- |
| Docker | Multi-stage build (5 stages) | Producao otimizada com tini, non-root user, healthcheck |
| PostgreSQL | bitnami/postgresql | Banco principal, 5 tabelas, 3 enums |
| Redis | latest | Cache distribuido + backend BullMQ, persistencia AOF |
| RabbitMQ | 3-management | Fila de mensagens com exchanges duraveis |
| Nginx | latest | Proxy reverso, load balancer |

### Ferramentas de Build e Qualidade

| Ferramenta | Versao | Proposito |
| ---------- | ------ | --------- |
| tsup | 8.5.1 | Bundler para producao (ESM, minificado) |
| Vitest | 4.1.5 | Framework de testes (unit + integration) |
| Supertest | 7.2.2 | Testes HTTP de integracao |
| Biome | 2.4.13 | Linter e formatter unificado |
| dependency-cruiser | 17.3.10 | Validacao de regras de dependencia entre camadas |
| archunit | 2.1.69 | Testes de fitness arquitetural |

### Padroes Arquiteturais

- **Clean Architecture**: Separacao domain/application/infra por bounded context
- **DDD**: Bounded Contexts, Entities, Value Objects, Domain Events, Specifications
- **CQRS parcial**: Query objects separados (UserQuery)
- **Observer Pattern**: Entidades estendem Observable para domain events
- **Either Pattern**: Tratamento funcional de erros sem exceptions em business logic
- **Repository Pattern**: Interfaces em application, implementacoes em infra
- **Provider Pattern**: Selecao de implementacao por ambiente (Prisma/SQLite/InMemory)
- **Unit of Work**: Transacoes coordenadas via PrismaUnitOfWork/SQLiteUnitOfWork

---

## 10 -- Arquitetura de Seguranca e Riscos

| Severidade | Achado | Localizacao | Detalhes |
| ---------- | ------ | ----------- | -------- |
| Critico | CORS permite todas as origens | src/shared/infra/server/fastify-adapter.ts:76-82 | `origin: true` com `credentials: true` permite que qualquer site faca requisicoes autenticadas |
| Critico | Ausencia de rate limiting | Nenhum middleware encontrado | Endpoints de autenticacao vulneraveis a forca bruta. Existe handler de erro para rate limit (global-error-handler.ts:37-40) mas nenhum middleware registrado |
| Alto | bcrypt salt rounds muito baixo | PASSWORD_SALT=2 (default em .env.example) | Industria recomenda 10-12 rounds para producao |
| Alto | Dados sensiveis em logs | src/shared/infra/server/global-error-handler.ts:43 | Error handler loga objetos completos que podem conter dados sensiveis |
| Medio | NODE_ENV nao aceita "development" | src/shared/infra/env/index.ts:10 | Schema Zod so aceita "test" e "production"; .env.development define NODE_ENV=development |
| Medio | Response validation desabilitada em producao | src/shared/infra/server/hooks/response-validation-hook.ts:121 | Validacao de schema de resposta so ativa em ambiente nao-production |

### Boas Praticas de Seguranca Encontradas

- Segredos externalizados em variaveis de ambiente (nao hardcoded)
- Validacao de assinatura JWT implementada corretamente
- Verificacao de assinatura de webhook Stripe
- Blacklisting de tokens via Redis para logout
- RBAC com pre-handlers por rota (isProtected, onlyAdmin)
- Validacao de input com Zod em todas as rotas
- Hash de senha com bcrypt e comparacao timing-safe
- JWT ID (jwi) gerado com randomBytes para prevencao de replay

---

## 11 -- Analise de Infraestrutura

### Docker

O Dockerfile utiliza build multi-stage com 5 etapas:
1. **base**: Node 22.20.0 slim com corepack/pnpm
2. **deps**: Instalacao de todas as dependencias
3. **builder**: Geracao do Prisma Client + compilacao com tsup
4. **prod-deps**: Apenas dependencias de producao
5. **runner**: Imagem final minima com tini (init), usuario nao-root (nodejs:1001), healthcheck via GET /health a cada 30s

### Docker Compose (4 servicos)

| Servico | Imagem | Porta | Persistencia |
| ------- | ------ | ----- | ------------ |
| PostgreSQL | bitnami/postgresql | 5432 | Volume nomeado |
| RabbitMQ | 3-management | 5672 (AMQP), 15672 (UI) | Nenhuma |
| Redis | latest | 6379 | Volume nomeado (AOF) |
| Nginx | latest | 80 | Config montada |

### Observacoes

- Nginx configurado como proxy reverso com acesso ao host via `host.docker.internal`
- RabbitMQ sem persistencia de volume configurada (risco de perda de mensagens em restart)
- Redis com persistencia AOF habilitada

---

## 12 -- Codigo Morto

### Arquivos Completamente Mortos

Nenhum arquivo completamente morto identificado. Todos os arquivos possuem pelo menos um export utilizado em testes ou em outros modulos.

### Exports Mortos

| Arquivo | Export | Motivo | Confianca |
| ------- | ------ | ------ | --------- |
| src/user/infra/controller/routes/user-routes.ts | `UserRoutesType` | Tipo exportado, nunca importado em nenhum arquivo | ALTA |
| src/subscription/infra/controller/routes/subscription-routes.ts | `SubscriptionRoutesType` | Tipo exportado, nunca importado em nenhum arquivo | ALTA |
| src/user/domain/value-object/password.ts | `PasswordData` | Tipo exportado, nunca importado em nenhum arquivo | ALTA |

**Total de Linhas**: ~20 linhas de exports mortos

### Possivelmente Mortos (Verificacao Necessaria)

| Variavel de Ambiente | Localizacao | Motivo | Verificacao Necessaria |
| -------------------- | ----------- | ------ | ---------------------- |
| `REFRESH_TOKEN_NAME` | env/index.ts | Definida no schema mas sem referencia em src/ | Verificar uso indireto |
| `ITEMS_PER_PAGE` | env/index.ts | Definida no schema mas sem referencia em src/ | Verificar uso indireto |
| `CHECK_IN_EXPIRATION_TIME` | env/index.ts | Definida no schema mas sem referencia em src/ | Verificar uso indireto |
| `TTL` | env/index.ts | Definida no schema mas sem referencia em src/ | Verificar uso indireto |
| `STRIPE_PUBLIC_KEY` | env/index.ts | Definida no schema mas sem referencia em src/ | Verificar se usada no frontend |
| `STRIPE_PRICE_ID` | env/index.ts | Definida no schema mas sem referencia em src/ | Verificar uso indireto |

### Codigo Interno Morto

| Arquivo | Linha | Descricao |
| ------- | ----- | --------- |
| src/check-in/application/use-case/check-in.usecase.ts | ~109 | Comentario `// throw new Error('Erro Transaction')` -- codigo de debug comentado |
| src/user/application/use-case/create-user.usecase.ts | 85-88 | Bloco de transacao comentado com `console.log({ tx })` -- debug residual |

---

## 13 -- Funcionalidade Duplicada

### Critico: Duplicatas Exatas

#### Grupo de Duplicacao 1: Padrao `parseBodyOrError` em Controllers

**Instancias**: 6+
**Arquivos**:
- src/user/infra/controller/create-user.controller.ts (linhas 113-121)
- src/user/infra/controller/change-password.controller.ts (linhas 79-84)
- src/user/infra/controller/update-user-profile.controller.ts (linhas 64-69)
- src/user/infra/controller/activate-user.controller.ts (linhas 78-84)
- src/session/infra/controller/refresh-token.controller.ts (linhas 129-135)
- src/check-in/infra/controller/check-in.controller.ts (padrao similar)

**Padrao**:
```typescript
private parseBodyOrError(body: unknown): Either<ValidationError, Payload> {
  const result = schema.safeParse(body)
  if (!result.success) return failure(fromError(result.error))
  return success(result.data)
}
```

**Linhas Duplicadas**: ~36 linhas (6 x 6)

#### Grupo de Duplicacao 2: Padrao `bindMethods` em Controllers

**Instancias**: 23 (todos os controllers)
**Padrao**:
```typescript
constructor() {
  this.bindMethods()
}
private bindMethods() {
  this.callback = this.callback.bind(this)
}
```

**Linhas Duplicadas**: ~115 linhas (23 x 5)

### Alto: Logica Similar

#### Grupo de Duplicacao 3: Padrao `withTransaction` em Repositories Prisma

**Instancias**: 4
**Arquivos**:
- src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts (linhas 35-42)
- src/shared/infra/database/repository/prisma/prisma-user-repository.ts (linhas 36-41)
- src/shared/infra/database/repository/prisma/prisma-gym-repository.ts
- src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts

**Padrao**:
```typescript
public withTransaction<TX extends object>(prismaClient: TX): Repository {
  if (!PrismaUnitOfWork.isClientTransaction(prismaClient)) {
    throw new InvalidTransactionInstance(prismaClient)
  }
  return new ThisRepository(prismaClient)
}
```

**Linhas Duplicadas**: ~28 linhas (4 x 7)

#### Grupo de Duplicacao 4: Padrao create/validate/restore em Value Objects

**Instancias**: 7+ (Email, Name, Password, Phone, Role, Status, CNPJ)
**Padrao**:
```typescript
public static create(value: string): Either<Error, VO> {
  const result = validate(value)
  if (result.isFailure()) return failure(result.value)
  return success(new VO(result.value))
}
public static restore(value: string): VO { return new VO(value) }
get value(): string { return this._value }
```

**Linhas Duplicadas**: ~56 linhas (7 x 8)

#### Grupo de Duplicacao 5: Padrao de Event Subscriber em Use Cases

**Instancias**: 5+
**Padrao**:
```typescript
constructor() {
  void this.bindMethod()
  void this.setupEventListener()
}
private bindMethod(): void { ... }
private setupEventListener(): void {
  DomainEventPublisher.instance.subscribe("eventName", this.handler)
}
```

**Linhas Duplicadas**: ~50 linhas (5 x 10)

### Medio: Duplicacao Conceitual

#### Grupo de Duplicacao 6: Padrao de Resposta de Erro em Controllers

**Instancias**: 40+ (em todos os controllers)
**Padrao**:
```typescript
if (result.isFailure()) {
  return ResponseFactory.BAD_REQUEST({ message: result.value.message })
}
```

Nota: Embora este padrao seja repetitivo, e inerente ao design de controllers em Clean Architecture e nao necessariamente requer extracao, mas poderia ser simplificado com um helper de mapeamento de erros.

---

## 14 -- Anti-Padroes Arquiteturais

### God Objects

| Arquivo | Linhas | Responsabilidades | Problema |
| ------- | ------ | ----------------- | -------- |
| src/user/domain/user.ts | 279 | Validacao de nome/email, gestao de senha, transicao de status, atualizacao de perfil, billing customer, domain events | 20+ metodos publicos; violacao de SRP |
| src/shared/infra/server/fastify-adapter.ts | 284 | Registro de rotas, CORS, raw body parsing, validacao de resposta, error handling, auth checking, admin verification | Multiplas responsabilidades de servidor |

### Dependencias Circulares

Nenhuma dependencia circular detectada entre bounded contexts.

### Violacoes de Camada

Nenhuma violacao de camada detectada. A pureza das camadas domain e application esta intacta:
- Domain: zero imports de application ou infra
- Application: zero imports de infra

### Acoplamento Forte

| Componente | Problema | Detalhes |
| ---------- | -------- | -------- |
| CreateUserUseCase | 4 de 5 dependencias sao de infraestrutura | Queue, Logger, UnitOfWork, Worker injetados diretamente (deveriam ser interfaces em application/) |
| CheckInUseCase | 3 de 6 dependencias sao de infraestrutura | Queue, UnitOfWork, Logger injetados diretamente |
| GYM domain | Importa value objects de USER e CHECK-IN | Name, Phone de @/user, Coordinate de @/check-in -- acoplamento entre bounded contexts no nivel de domain |

Nota: Os use cases injetam interfaces (Queue, Logger, UnitOfWork) definidas em shared/infra, que atuam como abstraccoes. Porem, essas interfaces estao localizadas na camada de infraestrutura ao inves de application, criando uma dependencia direcional questionavel.

### Type Assertions Inseguros (em codigo de producao)

| Arquivo | Asserccao | Contexto |
| ------- | --------- | -------- |
| src/session/infra/controller/refresh-token.controller.ts | `parsedCookie as unknown as Cookie` | Resultado de parsing de cookie |
| src/shared/infra/queue/rabbitmq-adapter.ts | `data.content.toString() as unknown as TData` | Desserializacao de mensagem da fila |
| src/shared/infra/gateway/testing-subscription-gateway.ts | `{} as unknown as any` | Mock de gateway para testes |

---

## 15 -- Problemas de Tipagem

### Uso de `any`

| Arquivo | Contexto | Severidade |
| ------- | -------- | ---------- |
| src/shared/domain/event/domain-event.ts | `public abstract toJSON(): any` | Media -- serializacao de dominio |
| src/check-in/infra/controller/check-in.controller.ts | `private async callback(req: any)` | Alta -- parametro de request |
| src/user/application/persistence/repository/user-query.ts | `public get values(): any` | Media -- accessor de query |
| src/shared/infra/controller/queue-controller.ts | `async (event: any)` | Media -- evento de fila |
| src/shared/infra/gateway/circuit-breaker.ts | `type AsyncFunction = (...args: any) => Promise<any>` | Media -- tipo generico |
| src/shared/infra/gateway/retry.ts | `type GenericFunction = (...args: any[]) => any` | Media -- tipo generico |
| src/shared/infra/controller/factory/response-factory.ts | `[key: string]: any` e `body: any` | Alta -- interface de resposta |
| src/shared/infra/gateway/node-mailer-adapter.ts | `private async fireAndForgetSendMail(mailResponse: any)` | Media |
| src/shared/infra/decorator/logger.ts | `target: any`, `...args: any[]`, `error: any` | Alta -- decorator |
| src/shared/infra/presenter/csv-presenter.ts | `headers: any`, `rows: any[]`, `values: any[]` | Alta -- presenter |
| src/shared/infra/server/http-server.ts | `request: any`, `response: any`, `done: any` | Alta -- middleware |
| src/shared/infra/server/fastify-adapter.ts | `request: any` | Media -- middleware |
| src/shared/infra/database/connection/pg-client.ts | `params: any[]` | Media -- query params |
| src/shared/infra/database/connection/sqlite-connection.ts | `params?: any[]` (3x) | Media |
| src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts | `assertUserData(object: any)` | Media -- type guard |
| src/shared/infra/database/repository/unit-of-work/prisma-unit-of-work.ts | `isClientTransaction(obj: any)` | Media -- type guard |
| src/shared/infra/database/repository/unit-of-work/sqlite-unit-of-work.ts | `isClientTransaction(obj: any)` | Media -- type guard |
| src/shared/infra/worker/worker.ts | `async (job: any)` | Media -- queue job |

**Total de usos de `any` em producao**: ~30 instancias

### @ts-ignore / @ts-expect-error

Nenhuma instancia encontrada em codigo de producao.

### Supressoes de Linter (biome-ignore)

| Arquivo | Regra | Justificativa |
| ------- | ----- | ------------- |
| src/subscription/application/use-case/create-customer.usecase.ts | noNonNullAssertion | Non-null assertion |
| src/shared/domain/event/domain-event-publisher.ts | noNonNullAssertion | Guard clause antes do acesso |
| src/subscription/infra/worker/stripe-webhook-worker.ts | cognitive complexity | Arquivo de 220 linhas com logica de routing complexa |
| src/shared/infra/openapi/openapi-schema-builder.ts | cognitive complexity | Builder pattern com muitas ramificacoes |
| src/shared/infra/gateway/circuit-breaker.ts | noNonNullAssertion | Verificacao previa antes do acesso |
| src/shared/infra/queue/queue-memory-adapter.ts | noNonNullAssertion (2x) | Null checks antes do uso |

**Total de supressoes de linter em producao**: 8

### Uso de `unknown`

Usado adequadamente com type guards em type assertions e verificacoes de transacao. Pratica aceitavel.

---

## 16 -- Code Smells

### Componentes/Funcoes Longas

| Arquivo | Linhas | Problema |
| ------- | ------ | -------- |
| src/check-in/application/use-case/check-in.usecase.ts | 94 linhas (metodo execute) | Poderia ser decomposto em metodos privados: validacao de elegibilidade, validacao de distancia, publicacao de evento |
| src/subscription/infra/worker/stripe-webhook-worker.ts | 220 linhas | Worker com routing de eventos complexo; biome-ignore para complexidade cognitiva |
| src/shared/infra/server/hooks/response-validation-hook.ts | 144 linhas | Hook de validacao com multiplas ramificacoes |

### Numeros Magicos

| Localizacao | Valor | Deveria Ser |
| ----------- | ----- | ----------- |
| src/check-in/domain/value-object/distance.ts | `(Math.PI * latitude) / 180` | Constante `DEGREES_TO_RADIANS` |
| src/check-in/domain/value-object/distance.ts | `dist * 60 * 1.1515` | Constante `NAUTICAL_MILES_CONVERSION` |
| src/check-in/domain/value-object/distance.ts | `dist * 1.609344` | Constante `MILES_TO_KM` |
| src/gym/domain/value-object/CNPJ.ts | `14`, `12`, `13`, `11` | Constantes nomeadas para validacao de CNPJ |

### Inconsistencia de Localizacao de Interfaces de Repositorio

| Bounded Context | Localizacao da Interface |
| --------------- | ----------------------- |
| user/ | application/persistence/repository/ |
| gym/ | application/repository/ |
| check-in/ | application/repository/ |
| subscription/ | repository/ (raiz do contexto) |

A falta de padronizacao dificulta a navegacao e viola o principio da menor surpresa.

### Codigo Comentado

2 blocos identificados (detalhados na Secao 12).

---

## 17 -- Estatisticas Consolidadas

| Categoria | Quantidade |
| --------- | ---------- |
| **Codigo Morto** | |
| -- Arquivos completamente mortos | 0 |
| -- Exports mortos | 3 (~20 linhas) |
| -- Variaveis de ambiente possivelmente obsoletas | 6 |
| -- Blocos de codigo comentado | 2 |
| **Duplicacao** | |
| -- Grupos de duplicacao | 6 |
| -- Arquivos afetados | 40+ |
| -- Linhas duplicadas | ~285 |
| **Problemas Arquiteturais** | |
| -- God objects | 2 |
| -- Dependencias circulares | 0 |
| -- Violacoes de camada | 0 |
| -- Acoplamento forte (use cases com deps de infra) | 4+ |
| -- Type assertions inseguros (producao) | 3 |
| **Problemas de Tipagem** | |
| -- Uso de `any` (producao) | ~30 |
| -- @ts-ignore / @ts-expect-error | 0 |
| -- Supressoes de linter (producao) | 8 |
| **Code Smells** | |
| -- Funcoes longas (50+ linhas) | 3 |
| -- Numeros magicos | 7+ |
| -- Codigo comentado | 2 |
| -- Inconsistencia de localizacao de interfaces | 4 contextos com 3 padroes diferentes |

---

## 18 -- Avaliacao de Impacto

### Potencial de Limpeza

- **Remocao de codigo morto**: ~20 linhas (exports mortos) + verificacao de 6 variaveis de ambiente
- **Consolidacao de duplicacao**: ~285 linhas -> ~60 linhas de utilitarios/base classes compartilhados
- **Reducao total estimada**: ~245 linhas (~1% da codebase de producao)

### Melhoria de Manutenibilidade

- Extracao de `parseBodyOrError` para base controller eliminaria correcao de bugs em 6+ locais
- Base class para Value Objects reduziria boilerplate de 7 VOs para 1 template
- Padronizacao de localizacao de interfaces de repositorio melhoraria navegacao e onboarding
- Refatoracao de `withTransaction` em Prisma repositories para base class reduziria 4 duplicatas para 1

### Areas de Risco

- **User entity (279 linhas)**: Tende a crescer com novas features (billing, preferencias, etc.) sem disciplina de extracao
- **FastifyAdapter (284 linhas)**: Concentra configuracao de servidor e pode crescer com novos middlewares
- **Stripe webhook worker (220 linhas)**: Complexidade cognitiva alta; novos tipos de evento aumentarao ainda mais
- **Seguranca**: CORS permissivo e ausencia de rate limiting sao riscos criticos para deploy em producao

---

## 19 -- Achados Positivos

1. **Zero violacoes de camada**: As camadas domain e application estao completamente puras -- nenhum import de infraestrutura
2. **Zero dependencias circulares**: Entre bounded contexts nao existem ciclos de dependencia
3. **Padrao Either consistente**: 56+ instancias de Either pattern para tratamento funcional de erros sem exceptions
4. **Validacao de input robusta**: Todas as rotas utilizam Zod para validacao de request (body, params, query)
5. **Validacao de ambiente em runtime**: Schema Zod garante que variaveis de ambiente existam e sejam validas no startup
6. **IoC container bem estruturado**: Inversify com symbols, modules separados por bounded context, lifecycle management (singleton, request-scope)
7. **Provider Pattern elegante**: Selecao automatica de implementacao (Prisma/SQLite/InMemory) baseada em ambiente
8. **Domain Events implementados**: Observer pattern com DomainEventPublisher para comunicacao entre modulos
9. **Testes abrangentes**: 99 arquivos de teste cobrindo unit, business-flow e integration (33% ratio)
10. **Docker production-ready**: Multi-stage build, non-root user, healthcheck, tini init system
11. **Validacao arquitetural automatizada**: dependency-cruiser + archunit para testes de fitness
12. **Redis com fallback**: Resiliencia em caso de indisponibilidade do Redis com fallback para in-memory
13. **Webhook Stripe seguro**: Verificacao de assinatura e deduplicacao de eventos implementadas
14. **Token blacklisting**: Mecanismo de revogacao de JWT via Redis para logout efetivo

---

## 20 -- Priorizacao de Achados

### 1. Imediato (Alto Impacto, Baixo Esforco)

- Restringir CORS para origens especificas em producao (`origin: ['http://allowed-domain.com']` ao inves de `origin: true`)
- Aumentar `PASSWORD_SALT` default de 2 para 10-12 em .env.example e documentacao
- Deletar exports mortos: `UserRoutesType`, `SubscriptionRoutesType`, `PasswordData`
- Remover codigo comentado em check-in.usecase.ts e create-user.usecase.ts
- Verificar e remover variaveis de ambiente obsoletas (REFRESH_TOKEN_NAME, ITEMS_PER_PAGE, CHECK_IN_EXPIRATION_TIME, TTL, STRIPE_PUBLIC_KEY, STRIPE_PRICE_ID)

### 2. Curto Prazo (Impacto Medio)

- Implementar rate limiting (fastify-rate-limit) para endpoints de autenticacao
- Extrair `parseBodyOrError` para base controller ou helper compartilhado (elimina 6+ duplicatas)
- Extrair `withTransaction` para base Prisma repository (elimina 4 duplicatas)
- Padronizar localizacao de interfaces de repositorio (escolher application/repository/ para todos)
- Adicionar "development" como valor valido no schema de NODE_ENV
- Implementar filtragem de logs para dados sensiveis no global error handler
- Decompor `CheckInUseCase.execute()` em metodos privados menores

### 3. Longo Prazo (Nice-to-have)

- Considerar base class generica para Value Objects (reduce boilerplate de 7 VOs)
- Refatorar User entity para separar concerns (ex: UserProfile, UserCredentials, UserBilling)
- Mover interfaces de Queue, Logger, UnitOfWork para shared/application/ ao inves de shared/infra/
- Reduzir uso de `any` nos ~30 locais identificados, priorizando response-factory.ts, csv-presenter.ts e http-server.ts
- Refatorar stripe-webhook-worker.ts para Strategy pattern (reduzir complexidade cognitiva)
- Considerar extrair FastifyAdapter em composicoes menores (RouteRegistrar, MiddlewareConfigurator, etc.)
- Configurar persistencia de volume para RabbitMQ no docker-compose
