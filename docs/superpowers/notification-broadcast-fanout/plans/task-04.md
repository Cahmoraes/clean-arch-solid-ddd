# Task 4: Criar `NotificationBroadcastPublisher` [FR-001]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** standard
**Depends on:** task-02, task-03

## Visão Geral

Criar `NotificationBroadcastPublisher`, um componente injetável que encapsula a publicação de
payloads na exchange fanout `notificationBroadcast` via `Queue.publish` (agora com suporte a tipo de
exchange, da Task 2), e registrá-lo no container Inversify do módulo `notification`. Os bindings de
`RedisNotificationPublisher`/`RedisNotificationSubscriber` permanecem intactos — serão removidos na
Task 8.

## Arquivos

- Create: `apps/backend/src/notification/infra/queue/notification-broadcast-publisher.ts`
- Test: `apps/backend/src/notification/infra/queue/notification-broadcast-publisher.test.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts` (binding)

### Conformidade com as Skills Padrão

- `typescript-advanced`: uso de generics em `publish<TPayload>` e injeção via decorator `@inject`.
- `test-antipatterns`: mock mínimo de `Queue`, sem sobre-mockar métodos não exercitados.
- `no-workarounds`: usar o `SHARED_TYPES.Queue` e o `EXCHANGES.NOTIFICATION_BROADCAST` reais, sem
  hardcode de string solta fora da constante central.

## Passos

- **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest"
import type { Queue } from "@/shared/infra/queue/queue"
import { NotificationBroadcastPublisher } from "./notification-broadcast-publisher"

function makeMockQueue(): Queue {
	return {
		connect: vi.fn(),
		publish: vi.fn(),
		consume: vi.fn(),
	}
}

describe("NotificationBroadcastPublisher", () => {
	describe("publish", () => {
		it("should publish payload to the notificationBroadcast fanout exchange", async () => {
			const queue = makeMockQueue()
			const publisher = new NotificationBroadcastPublisher(queue)

			await publisher.publish({ userId: "u1", notificationId: "n1" })

			expect(queue.publish).toHaveBeenCalledWith(
				"notificationBroadcast",
				{ userId: "u1", notificationId: "n1" },
				"fanout",
			)
		})
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- -t "NotificationBroadcastPublisher"`
Expected: FAIL (módulo não existe).

- **Step 3: Write minimal implementation**

```typescript
import { inject, injectable } from "inversify"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { Queue } from "@/shared/infra/queue/queue"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class NotificationBroadcastPublisher {
	constructor(@inject(SHARED_TYPES.Queue) private readonly queue: Queue) {}

	public async publish<TPayload>(payload: TPayload): Promise<void> {
		await this.queue.publish(EXCHANGES.NOTIFICATION_BROADCAST, payload, "fanout")
	}
}
```

Confirmar o caminho exato de `SHARED_TYPES` — mesmo import usado por `queue-provider.ts`:
`@/shared/infra/ioc/types`.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test:run -- -t "NotificationBroadcastPublisher"`
Expected: PASS.

- **Step 5: Registrar no container**

Em `notification-module.ts`, importar `NotificationBroadcastPublisher` de
`@/notification/infra/queue/notification-broadcast-publisher` e adicionar o binding:

```typescript
bind(NOTIFICATION_TYPES.Infra.NotificationBroadcastPublisher)
	.to(NotificationBroadcastPublisher)
	.inSingletonScope()
```

Manter os bindings `RedisNotificationPublisher`/`RedisNotificationSubscriber` intactos por enquanto
— serão removidos na Task 8.

- **Step 6: Verificar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS.

- **Step 7: Commit**

```bash
git add apps/backend/src/notification/infra/queue/notification-broadcast-publisher.ts apps/backend/src/notification/infra/queue/notification-broadcast-publisher.test.ts apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts
git commit -m "feat(notification): adiciona NotificationBroadcastPublisher"
```

## Critérios de Sucesso

- Teste novo passa.
- Binding Inversify presente em `notification-module.ts`.
- `tsc:check` limpo.
