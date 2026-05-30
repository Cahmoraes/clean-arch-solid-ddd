# Task 11: IoC wiring + bootstrap [RF-001, RF-002]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-05, task-06, task-07, task-09, task-10

## Visão Geral

Conectar todos os componentes do bounded context `notification` ao container Inversify e ao bootstrap do servidor. Criar `notification-types.ts` (service identifiers), `notification-module.ts` (ContainerModule), `setup-notification-module.ts` (bootstrap) e atualizar `server-build.ts` + `types.ts`.

## Arquivos

- Create: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`
- Create: `apps/backend/src/bootstrap/setup-notification-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/container.ts` (carregar o notification-module)
- Modify: `apps/backend/src/bootstrap/server-build.ts`

### Conformidade com as Skills Padrão

- code-style: `Symbol.for()` para service identifiers, `ContainerModule`, `inSingletonScope()` para SseManager e RedisNotificationSubscriber

## Passos

### Passo 1: Criar `notification-types.ts`

Arquivo: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`

```ts
export const NOTIFICATION_TYPES = {
  Repositories: {
    Notification: Symbol.for("NotificationRepository"),
  },
  UseCases: {
    GetNotifications: Symbol.for("GetNotificationsUseCase"),
    GetUnreadCount: Symbol.for("GetUnreadCountUseCase"),
    MarkAsRead: Symbol.for("MarkAsReadUseCase"),
    MarkAllAsRead: Symbol.for("MarkAllAsReadUseCase"),
  },
  Controllers: {
    GetNotifications: Symbol.for("GetNotificationsController"),
    GetUnreadCount: Symbol.for("GetUnreadCountController"),
    MarkAsRead: Symbol.for("MarkAsReadController"),
    MarkAllAsRead: Symbol.for("MarkAllAsReadController"),
    NotificationStream: Symbol.for("NotificationStreamController"),
  },
  EventHandlers: {
    CreateNotificationOnCheckIn: Symbol.for(
      "CreateNotificationOnCheckInEventHandler",
    ),
  },
  Infra: {
    SseManager: Symbol.for("SseManager"),
    RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
    RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
    NotificationQueueWorker: Symbol.for("NotificationQueueWorker"),
  },
} as const
```

### Passo 2: Exportar `NOTIFICATION_TYPES` de `types.ts`

Arquivo: `apps/backend/src/shared/infra/ioc/types.ts`

Adicionar a linha de export:

```ts
export { AUTH_TYPES } from "./module/service-identifier/auth-types"
export { CHECKIN_TYPES } from "./module/service-identifier/checkin-types"
export { GYM_TYPES } from "./module/service-identifier/gym-types"
export { HEALTH_CHECK_TYPES } from "./module/service-identifier/health-check-types"
export { NOTIFICATION_TYPES } from "./module/service-identifier/notification-types"
export { SHARED_TYPES } from "./module/service-identifier/shared-types"
export { USER_TYPES } from "./module/service-identifier/user-types"
```

### Passo 3: Criar `notification-module.ts`

Arquivo: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`

```ts
import { ContainerModule } from "inversify"

import { GetNotificationsUseCase } from "@/notification/application/use-case/get-notifications.usecase.js"
import { GetUnreadCountUseCase } from "@/notification/application/use-case/get-unread-count.usecase.js"
import { MarkAllAsReadUseCase } from "@/notification/application/use-case/mark-all-as-read.usecase.js"
import { MarkAsReadUseCase } from "@/notification/application/use-case/mark-as-read.usecase.js"
import { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler.js"
import { GetNotificationsController } from "@/notification/infra/controller/get-notifications.controller.js"
import { GetUnreadCountController } from "@/notification/infra/controller/get-unread-count.controller.js"
import { MarkAllAsReadController } from "@/notification/infra/controller/mark-all-as-read.controller.js"
import { MarkAsReadController } from "@/notification/infra/controller/mark-as-read.controller.js"
import { NotificationStreamController } from "@/notification/infra/controller/notification-stream.controller.js"
import { RedisNotificationPublisher } from "@/notification/infra/redis/redis-notification-publisher.js"
import { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber.js"
import { NotificationQueueWorker } from "@/notification/infra/worker/notification-queue-worker.js"
import { SseManager } from "@/notification/infra/sse/sse-manager.js"
import { NOTIFICATION_TYPES } from "../../types.js"
import { NotificationRepositoryProvider } from "@/notification/infra/repository/notification-repository-provider.js"

export const notificationModule = new ContainerModule(({ bind }) => {
  bind(NOTIFICATION_TYPES.Repositories.Notification)
    .toDynamicValue(NotificationRepositoryProvider.provide)
    .inSingletonScope()

  bind(NOTIFICATION_TYPES.UseCases.GetNotifications).to(GetNotificationsUseCase)
  bind(NOTIFICATION_TYPES.UseCases.GetUnreadCount).to(GetUnreadCountUseCase)
  bind(NOTIFICATION_TYPES.UseCases.MarkAsRead).to(MarkAsReadUseCase)
  bind(NOTIFICATION_TYPES.UseCases.MarkAllAsRead).to(MarkAllAsReadUseCase)

  bind(NOTIFICATION_TYPES.Controllers.GetNotifications).to(
    GetNotificationsController,
  )
  bind(NOTIFICATION_TYPES.Controllers.GetUnreadCount).to(
    GetUnreadCountController,
  )
  bind(NOTIFICATION_TYPES.Controllers.MarkAsRead).to(MarkAsReadController)
  bind(NOTIFICATION_TYPES.Controllers.MarkAllAsRead).to(MarkAllAsReadController)
  bind(NOTIFICATION_TYPES.Controllers.NotificationStream).to(
    NotificationStreamController,
  )

  bind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn).to(
    CreateNotificationOnCheckInEventHandler,
  )

  bind(NOTIFICATION_TYPES.Infra.SseManager).to(SseManager).inSingletonScope()
  bind(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher)
    .to(RedisNotificationPublisher)
    .inSingletonScope()
  bind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)
    .to(RedisNotificationSubscriber)
    .inSingletonScope()
  bind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker).to(
    NotificationQueueWorker,
  )
})
```

### Passo 4: Verificar como o container carrega os modules

```bash
cat apps/backend/src/shared/infra/ioc/container.ts
```

O container centraliza o carregamento dos `ContainerModule`. Adicionar o `notificationModule`:

Arquivo: `apps/backend/src/shared/infra/ioc/container.ts`

Localizar onde outros modules são carregados (com `.load(checkInModule, gymModule, ...)`) e adicionar `notificationModule`:

```ts
import { notificationModule } from "./module/notification/notification-module.js"

// Na chamada container.load():
container.load(
  sharedModule,
  userModule,
  gymModule,
  checkInModule,
  sessionModule,
  subscriptionModule,
  healthCheckModule,
  notificationModule,  // <-- adicionar
)
```

### Passo 5: Criar `setup-notification-module.ts`

Arquivo: `apps/backend/src/bootstrap/setup-notification-module.ts`

```ts
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"
import type { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler.js"
import type { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber.js"
import type { ModuleControllers } from "./server-build.js"
import { resolve } from "./server-build.js"

export function setupNotificationModule(): ModuleControllers {
  const checkInEventHandler =
    resolve<CreateNotificationOnCheckInEventHandler>(
      NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn,
    )
  checkInEventHandler.subscribe()

  const redisSubscriber = resolve<RedisNotificationSubscriber>(
    NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber,
  )
  redisSubscriber.subscribe()

  const controllers = [
    resolve(NOTIFICATION_TYPES.Controllers.GetNotifications),
    resolve(NOTIFICATION_TYPES.Controllers.GetUnreadCount),
    resolve(NOTIFICATION_TYPES.Controllers.MarkAsRead),
    resolve(NOTIFICATION_TYPES.Controllers.MarkAllAsRead),
    resolve(NOTIFICATION_TYPES.Controllers.NotificationStream),
  ]

  const workers = [resolve(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)]

  return { controllers, workers }
}
```

### Passo 6: Registrar `setupNotificationModule` em `server-build.ts`

Arquivo: `apps/backend/src/bootstrap/server-build.ts`

Adicionar import e chamada no array `modules`:

```ts
import { setupNotificationModule } from "./setup-notification-module.js"

// Na função serverBuild(), no array modules:
const modules = [
  setupUserModule(),
  setupGymModule(),
  setupCheckInModule(),
  setupSessionModule(),
  setupHealthCheckModule(),
  setupSubscriptionModule(),
  setupNotificationModule(),  // <-- adicionar
]
```

### Passo 7: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

> **Nota:** Os controllers registrados (GetNotificationsController, etc.) ainda não existem em disco — serão criados nas tasks 12 e 13. O `tsc:check` vai falhar com "módulo não encontrado". Neste caso, aguarde as tasks 12 e 13 antes de executar o type-check final. Execute apenas lint por ora:

```bash
cd apps/backend
pnpm biome:fix
```

### Passo 8: Commit

```bash
git add \
  apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts \
  apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts \
  apps/backend/src/bootstrap/setup-notification-module.ts \
  apps/backend/src/shared/infra/ioc/types.ts \
  apps/backend/src/shared/infra/ioc/container.ts \
  apps/backend/src/bootstrap/server-build.ts
git commit -m "feat(notification): wire notification module into IoC container and bootstrap"
```

## Critérios de Sucesso

- `NOTIFICATION_TYPES` exportado de `types.ts` e usado em todos os use cases e handlers [RF-001, RF-002]
- `notificationModule` registra todos os bindings com scopes corretos (singleton para SseManager, Publisher, Subscriber) [RF-001, RF-002]
- `setupNotificationModule()` subscreve event handler e inicia Redis subscriber no boot [RF-001, RF-002]
- `server-build.ts` chama `setupNotificationModule()` [RF-001]
- `biome:fix` passa sem erros (type-check completo após tasks 12 e 13)
