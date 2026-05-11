# Task 4: Atualizar IoC (shared-types + infra-module)

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/winston-to-pino-migration-design.md`

## Visão Geral

Registrar o `PinoLogger` (instância raiz) e o `PinoAdapter` no container IoC. Adicionar o símbolo `PinoLogger` em `shared-types.ts`. Atualizar `infra-module.ts` para remover o binding do `WinstonAdapter` e adicionar os dois novos bindings. Após esta task, `SHARED_TYPES.PinoLogger` estará disponível para injeção no `PinoAdapter` (Task 3) e no `FastifyAdapter` (Task 5).

## Arquivos

- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts`

## Passos

- [ ] **Step 1: Adicionar símbolo `PinoLogger` em `shared-types.ts`**

Arquivo: `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts`

Localizar a linha com `Logger: Symbol.for("Logger")` e adicionar `PinoLogger` logo abaixo:

```typescript
// Antes:
  Logger: Symbol.for("Logger"),

// Depois:
  Logger: Symbol.for("Logger"),
  PinoLogger: Symbol.for("PinoLogger"),
```

O arquivo completo ficará assim (trecho relevante):

```typescript
export const SHARED_TYPES = {
  Controllers: {
    Queue: Symbol.for("QueueController"),
  },
  Task: {
    UpdateUserProfileCache: Symbol.for("UpdateUserProfileCacheTask"),
  },
  Server: {
    Fastify: Symbol.for("FastifyServer"),
  },
  Prisma: {
    Client: Symbol.for("PrismaClient"),
    UnitOfWork: Symbol.for("PrismaUnitOfWork"),
  },
  PG: {
    Client: Symbol.for("PgClient"),
  },
  SQLite: {
    Client: Symbol.for("SQLite"),
    UnitOfWork: Symbol.for("SQLiteUnitOfWork"),
  },
  Tokens: {
    Auth: Symbol.for("AuthToken"),
  },
  Cookies: {
    Manager: Symbol.for("CookieManager"),
  },
  Factories: {
    PreHandlerAuthenticate: Symbol.for("PreHandlerAuthenticate"),
  },
  Logger: Symbol.for("Logger"),
  PinoLogger: Symbol.for("PinoLogger"),
  Queue: Symbol.for("Queue"),
  Mailer: Symbol.for("Mailer"),
  Redis: Symbol.for("Redis"),
  UnitOfWork: Symbol.for("UnitOfWork"),
  CronJob: Symbol.for("CronJob"),
  Worker: Symbol.for("Worker"),
} as const
```

- [ ] **Step 2: Atualizar `infra-module.ts`**

Arquivo: `apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts`

**2a. Substituir o import do `WinstonAdapter` pelos novos imports:**

```typescript
// Remover:
import { WinstonAdapter } from "@/shared/infra/logger/winston-adapter"

// Adicionar:
import { PinoAdapter } from "@/shared/infra/logger/pino-adapter.js"
import { createPinoLogger } from "@/shared/infra/logger/pino-logger-factory.js"
```

**2b. Substituir o binding do Logger:**

```typescript
// Remover:
bind(SHARED_TYPES.Logger).to(WinstonAdapter).inSingletonScope()

// Adicionar (dois bindings, na mesma posição):
bind(SHARED_TYPES.PinoLogger).toConstantValue(createPinoLogger())
bind(SHARED_TYPES.Logger).to(PinoAdapter).inSingletonScope()
```

O bloco completo de bindings do `infraModule` ficará assim:

```typescript
export const infraModule = new ContainerModule(({ bind }) => {
  bind(SHARED_TYPES.Prisma.Client).toConstantValue(prismaClient)
  bind(SHARED_TYPES.Prisma.UnitOfWork).to(PrismaUnitOfWork).inSingletonScope()
  bind(SHARED_TYPES.PG.Client).toConstantValue(new PgClient())
  bind(SHARED_TYPES.SQLite.Client).toConstantValue(new SQLiteConnection())
  bind(SHARED_TYPES.Tokens.Auth).to(JsonWebTokenAdapter)
  bind(SHARED_TYPES.Server.Fastify).to(FastifyAdapter).inSingletonScope()
  bind(SHARED_TYPES.Cookies.Manager).to(CookieAdapter).inRequestScope()
  bind(SHARED_TYPES.Redis)
    .toDynamicValue(CacheDBProvider.provide)
    .inSingletonScope()
  bind(SHARED_TYPES.PinoLogger).toConstantValue(createPinoLogger())
  bind(SHARED_TYPES.Logger).to(PinoAdapter).inSingletonScope()
  bind(SHARED_TYPES.Queue)
    .toDynamicValue(QueueProvider.provide)
    .inSingletonScope()
  bind(NodeMailerAdapter).toSelf().inSingletonScope()
  bind(MailerGatewayMemory).toSelf().inSingletonScope()
  bind(SHARED_TYPES.Mailer).toDynamicValue(MailerProvider.provide)
  bind(SHARED_TYPES.Controllers.Queue).to(QueueController).inSingletonScope()
  bind(SHARED_TYPES.UnitOfWork).toDynamicValue(UnitOfWorkProvider.provide)
  bind(SHARED_TYPES.CronJob).to(NodeCronAdapter)
  bind(SHARED_TYPES.Task.UpdateUserProfileCache).to(UpdateUserProfileCacheTask)
  bind(SHARED_TYPES.Worker)
    .toDynamicValue(WorkerProvider.provide)
    .inSingletonScope()
})
```

- [ ] **Step 3: Verificar type-check**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend tsc:check
```

Neste ponto pode haver erros referentes ao `WinstonAdapter` ainda importado em outros lugares (será resolvido na Task 6) e ao `FastifyAdapter` ainda não recebendo `PinoLogger` (será resolvido na Task 5). Erros relacionados a esses dois arquivos são esperados.

Se houver outros erros inesperados, corrigi-los antes de prosseguir.

- [ ] **Step 4: Executar os testes unitários**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passando (os testes unitários usam `TestingLogger` via rebind e não são afetados pela mudança de binding).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts \
        apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts
git commit -m "feat(backend): register PinoAdapter and PinoLogger in IoC container

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `SHARED_TYPES.PinoLogger` adicionado em `shared-types.ts`
- `infra-module.ts` sem referências a `WinstonAdapter`
- Dois bindings registrados: `PinoLogger` (instância) e `Logger` (`PinoAdapter`)
- Testes unitários passando
