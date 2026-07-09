# Task 4: Criar `NotificationBroadcastPublisher` [FR-001]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** standard
**Depends on:** task-02, task-03

## Visão Geral

Criar `NotificationBroadcastPublisher`, um componente injetável que encapsula a publicação de
payloads na exchange fanout `notificationBroadcast` via `Queue.publish` (agora com suporte a tipo e
durabilidade de exchange, da Task 2), e registrá-lo no container Inversify do módulo `notification`.
Os bindings de `RedisNotificationPublisher`/`RedisNotificationSubscriber` permanecem intactos —
serão removidos na Task 8.

**Importante (ver D4 na spec):** o `publish` deve passar `durable: false` explicitamente como 4º
argumento. `NotificationBroadcastSubscriber` (Task 6) declara a mesma exchange
`notificationBroadcast` com `durable: false` via `amqp-connection-manager` — se este publisher
usar o default `true` de `Queue.publish` (Task 2), o RabbitMQ recusa a segunda declaração com
`PRECONDITION_FAILED` e fecha o canal assim que ambos os componentes estiverem ativos. Os dois
pontos de declaração precisam concordar no mesmo valor.

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
import type { Logger } from "@/shared/infra/logger/logger"
import { NotificationBroadcastPublisher } from "./notification-broadcast-publisher"

function makeMockQueue(): Queue {
	return {
		connect: vi.fn(),
		publish: vi.fn(),
		consume: vi.fn(),
	}
}

function makeMockLogger(): Logger {
	return { info: vi.fn(), error: vi.fn() } as unknown as Logger
}

describe("NotificationBroadcastPublisher", () => {
	describe("publish", () => {
		it("should publish payload to the notificationBroadcast fanout exchange", async () => {
			const queue = makeMockQueue()
			const logger = makeMockLogger()
			const publisher = new NotificationBroadcastPublisher(queue, logger)

			await publisher.publish({ userId: "u1", notificationId: "n1" })

			expect(queue.publish).toHaveBeenCalledWith(
				"notificationBroadcast",
				{ userId: "u1", notificationId: "n1" },
				"fanout",
				false,
			)
		})

		it("should log the publish event", async () => {
			const queue = makeMockQueue()
			const logger = makeMockLogger()
			const publisher = new NotificationBroadcastPublisher(queue, logger)

			await publisher.publish({ userId: "u1", notificationId: "n1" })

			expect(logger.info).toHaveBeenCalled()
		})

		it("should log and rethrow when queue.publish fails", async () => {
			const queue = makeMockQueue()
			const publishError = new Error("amqp down")
			queue.publish = vi.fn().mockRejectedValue(publishError)
			const logger = makeMockLogger()
			const publisher = new NotificationBroadcastPublisher(queue, logger)

			await expect(publisher.publish({ userId: "u1", notificationId: "n1" })).rejects.toThrow(
				publishError,
			)
			expect(logger.error).toHaveBeenCalled()
		})
	})
})
```

Confirmar o caminho exato de `Logger` — mesmo import de tipo usado por `rabbitmq-adapter.ts`:
`@/shared/infra/logger/logger`. Diferente do `RabbitMQAdapter` (que usa `LazyInject` por campo),
aqui a injeção é por construtor (`@inject(SHARED_TYPES.Logger)`), consistente com o padrão de
injeção do restante do projeto (ver `AGENTS.md` — Use Cases/Controllers) e mais simples de testar
sem depender do container global. O que se replica do `RabbitMQAdapter` é o comportamento de
observabilidade (log em cada publish bem-sucedido e em cada erro), não o mecanismo de injeção.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- -t "NotificationBroadcastPublisher"`
Expected: FAIL (módulo não existe).

- **Step 3: Write minimal implementation**

```typescript
import { inject, injectable } from "inversify"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { Queue } from "@/shared/infra/queue/queue"
import type { Logger } from "@/shared/infra/logger/logger"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class NotificationBroadcastPublisher {
	constructor(
		@inject(SHARED_TYPES.Queue) private readonly queue: Queue,
		@inject(SHARED_TYPES.Logger) private readonly logger: Logger,
	) {}

	public async publish<TPayload>(payload: TPayload): Promise<void> {
		try {
			await this.queue.publish(EXCHANGES.NOTIFICATION_BROADCAST, payload, "fanout", false)
			this.logger.info(this, { exchange: EXCHANGES.NOTIFICATION_BROADCAST })
		} catch (error) {
			this.logger.error(this, { exchange: EXCHANGES.NOTIFICATION_BROADCAST, error })
			throw error
		}
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
- `queue.publish` é chamado com `durable: false` como 4º argumento (mesmo valor asserido pelo
  `NotificationBroadcastSubscriber` na Task 6, evitando o `PRECONDITION_FAILED` descrito em D4).
- `logger.info` é chamado a cada publish bem-sucedido; `logger.error` é chamado (e o erro
  relançado) quando `queue.publish` falha.
- Binding Inversify presente em `notification-module.ts`.
- `tsc:check` limpo.
