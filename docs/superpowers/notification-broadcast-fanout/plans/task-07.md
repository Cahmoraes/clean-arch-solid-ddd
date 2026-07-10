# Task 7: Atualizar IoC e bootstrap para os novos componentes [FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** standard
**Depends on:** task-04, task-05, task-06

## Visão Geral

Trocar, no bootstrap do módulo `notification`, a resolução e inicialização do
`RedisNotificationSubscriber` pelo `NotificationBroadcastSubscriber` (Task 6), completando a
migração do caminho de broadcast em tempo real para o RabbitMQ. Nenhuma mudança de contrato HTTP
ocorre — o endpoint SSE continua funcionando da mesma forma para o cliente.

## Arquivos

- Modify: `apps/backend/src/bootstrap/setup-notification-module.ts`

### Conformidade com as Skills Padrão

- `refactoring`: troca de componente resolvido no bootstrap preservando o restante do fluxo
  (`CreateNotificationOnCheckInEventHandler.subscribe()`, `NotificationQueueWorker.init()`,
  controllers retornados).
- `no-workarounds`: substituição completa e limpa do import e da chamada, sem deixar referência
  morta ao componente antigo.

## Passos

- **Step 1: Ler o arquivo atual**

Ler `apps/backend/src/bootstrap/setup-notification-module.ts` (conteúdo já confirmado na pesquisa
desta feature) para confirmar que nenhuma outra parte do bootstrap além do bloco descrito abaixo
referencia `RedisNotificationSubscriber`.

- **Step 2: Write minimal implementation**

Substituir:

```typescript
const redisNotificationSubscriber = resolve<RedisNotificationSubscriber>(
	NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber,
)
await redisNotificationSubscriber.subscribe()
```

por:

```typescript
const notificationBroadcastSubscriber = resolve<NotificationBroadcastSubscriber>(
	NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber,
)
await notificationBroadcastSubscriber.start()
```

E trocar o import:

```typescript
import type { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"
```

por:

```typescript
import type { NotificationBroadcastSubscriber } from "@/notification/infra/queue/notification-broadcast-subscriber"
```

- **Step 3: Verificar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS (não há teste automatizado dedicado a este arquivo de bootstrap; a verificação é por
tipo + pelos testes de negócio/fluxo existentes no Step 4).

- **Step 4: Rodar a suíte de business-flow do módulo notification**

Run: `pnpm --filter backend test:business-flow -- -t "notification-stream"` (ou o nome exato do
arquivo `notification-stream.controller.business-flow-test.ts`, confirmando o nome real antes de
rodar).
Expected: PASS — confirma que o endpoint SSE continua respondendo corretamente após a troca de
bootstrap, sem nenhuma mudança de contrato HTTP.

- **Step 5: Commit**

```bash
git add apps/backend/src/bootstrap/setup-notification-module.ts
git commit -m "refactor(bootstrap): usa NotificationBroadcastSubscriber em vez de RedisNotificationSubscriber"
```

## Critérios de Sucesso

- `tsc:check` limpo.
- Suíte de business-flow do módulo notification continua verde.
- Bootstrap não referencia mais `RedisNotificationSubscriber`.
