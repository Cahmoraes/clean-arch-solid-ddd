# Task 8: Remover componentes Redis Pub/Sub obsoletos [FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** cheap
**Depends on:** task-07

## Visão Geral

Remover completamente `RedisNotificationPublisher` e `RedisNotificationSubscriber` — obsoletos após
a migração do broadcast de notificações para o RabbitMQ (Tasks 4-7) — incluindo seus bindings
Inversify e symbols, sem deixar imports mortos ou referências pendentes. Confirmar que nenhum outro
uso de Redis no projeto (rate-limit, BullMQ, redis-adapter compartilhado) é afetado por esta
remoção.

## Arquivos

- Delete: `apps/backend/src/notification/infra/redis/redis-notification-publisher.ts`
- Delete: `apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: garantir remoção limpa e completa, sem deixar import morto ou código comentado
  para trás.
- `refactoring`: remoção de componente obsoleto preservando o restante da estrutura do módulo
  `notification`.

## Passos

- **Step 1: Confirmar que não há outros consumidores**

Run: `grep -rn "RedisNotificationPublisher\|RedisNotificationSubscriber" apps/backend/src/`
Expected: apenas o binding em `notification-module.ts` e os dois arquivos-fonte a remover — nenhum
outro consumidor, já que as Tasks 4-7 já migraram todos os usos.

- **Step 2: Write minimal implementation — remover bindings e imports**

Remover do `notification-module.ts` os imports e os dois blocos `bind(...)`:

```typescript
bind(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher).to(RedisNotificationPublisher).inSingletonScope()
bind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber).to(RedisNotificationSubscriber).inSingletonScope()
```

e os imports:

```typescript
import { RedisNotificationPublisher } from "@/notification/infra/redis/redis-notification-publisher"
import { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"
```

- **Step 3: Remover os symbols**

Remover do bloco `Infra` em `notification-types.ts`:

```typescript
RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
```

- **Step 4: Deletar os arquivos-fonte**

```bash
git rm apps/backend/src/notification/infra/redis/redis-notification-publisher.ts apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts
```

Se a pasta `apps/backend/src/notification/infra/redis/` ficar vazia, removê-la também.

- **Step 5: Verificar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS (nenhuma referência pendente).

- **Step 6: Rodar a suíte completa de unit tests do backend**

Run: `pnpm --filter backend test:run`
Expected: PASS.

- **Step 7: Confirmar que nenhum outro uso de Redis foi afetado**

Run: `grep -rn "REDIS_HOST\|redis-adapter\|RedisAdapter" apps/backend/src/shared/`
Expected: continua retornando `shared/infra/database/redis/redis-adapter.ts`,
`shared/infra/server/plugins/rate-limit-plugin.ts` e `shared/infra/queue/bullmq-adapter.ts` intactos
— nenhum desses arquivos deve aparecer no diff desta task.

- **Step 8: Commit**

```bash
git add -A apps/backend/src/notification/infra/redis apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts
git commit -m "chore(notification): remove RedisNotificationPublisher/Subscriber obsoletos"
```

## Critérios de Sucesso

- `grep` não retorna nenhuma referência a `RedisNotificationPublisher`/`RedisNotificationSubscriber`.
- `tsc:check` e a suíte de unit tests do backend passam.
- Nenhum arquivo de rate-limit/BullMQ/redis-adapter compartilhado foi tocado.
