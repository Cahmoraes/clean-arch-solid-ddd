# Task 6: Criar `NotificationBroadcastSubscriber` com `amqp-connection-manager` [FR-002, FR-003, FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** capable
**Depends on:** task-01, task-03

## Visão Geral

Criar `NotificationBroadcastSubscriber`, componente injetável que usa `amqp-connection-manager` para
declarar, ao iniciar (`start()`), a exchange fanout `notificationBroadcast` e uma fila
exclusiva/auto-delete vinculada a ela, repassando cada mensagem consumida ao `SseManager` local. A
lib redeclara automaticamente exchange/fila/bind (via `setup`) em cada reconexão de TCP, garantindo
que a instância volte a receber broadcasts sem código adicional após uma queda de conexão.

**Importante (ver D4 na spec):** a exchange `notificationBroadcast` é asserida aqui com
`durable: false` — o mesmo valor que `NotificationBroadcastPublisher` (Task 4) deve passar
explicitamente ao `Queue.publish`. Se os dois pontos divergirem, o RabbitMQ recusa a segunda
declaração (`PRECONDITION_FAILED`) e fecha o canal.

## Arquivos

- Create: `apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.ts`
- Test: `apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.test.ts`

### Conformidade com as Skills Padrão

- `context7`: consultar a API real do pacote `amqp-connection-manager` publicado (v5.0.0) antes de
  codar, para confirmar o nome exato do tipo `ChannelWrapper` e a assinatura de
  `connection.createChannel({ setup })`.
- `typescript-advanced`: tipagem de `Channel`/`ConsumeMessage` do `amqplib` e do `ChannelWrapper` do
  `amqp-connection-manager`.
- `test-antipatterns`: mock do módulo `amqp-connection-manager` via `vi.mock`, mínimo o suficiente
  para exercitar o `setup` sem sobre-mockar.
- `no-workarounds`: usar a API real da lib (função `setup` reexecutada em reconexão), não uma
  reimplementação manual de reconexão.

## Passos

- **Step 0: Confirmar a API real via context7**

Antes de escrever o teste, consultar via `context7` a documentação/tipos publicados de
`amqp-connection-manager@5.0.0` para confirmar o nome exato do tipo exportado `ChannelWrapper` e a
assinatura de `connection.createChannel({ setup })`. Ajustar os imports/tipos do Step 3 se o
`context7` reportar uma API ligeiramente diferente da assumida abaixo.

- **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest"
import type { SseManager } from "@/notification/infra/sse/sse-manager"
import type { Logger } from "@/shared/infra/logger/logger"

const mockChannelWrapper = {
	waitForConnect: vi.fn().mockResolvedValue(undefined),
}
const mockConnection = {
	createChannel: vi.fn().mockReturnValue(mockChannelWrapper),
}
vi.mock("amqp-connection-manager", () => ({
	default: {
		connect: vi.fn().mockReturnValue(mockConnection),
	},
}))

import { NotificationBroadcastSubscriber } from "./notification-broadcast-subscriber"

function makeMockLogger(): Logger {
	return { info: vi.fn(), error: vi.fn() } as unknown as Logger
}

describe("NotificationBroadcastSubscriber", () => {
	describe("start", () => {
		it("should declare the fanout exchange and an exclusive auto-delete queue via setup", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const subscriber = new NotificationBroadcastSubscriber(sseManager, makeMockLogger())

			await subscriber.start()

			expect(mockConnection.createChannel).toHaveBeenCalledWith(
				expect.objectContaining({ setup: expect.any(Function) }),
			)
		})

		it("should forward a consumed message to SseManager.send", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const subscriber = new NotificationBroadcastSubscriber(sseManager, makeMockLogger())
			await subscriber.start()

			const setupFn = mockConnection.createChannel.mock.calls[0][0].setup
			const fakeChannel = {
				assertExchange: vi.fn().mockResolvedValue(undefined),
				assertQueue: vi.fn().mockResolvedValue({ queue: "amq.gen-xyz" }),
				bindQueue: vi.fn().mockResolvedValue(undefined),
				consume: vi.fn((_queue, onMessage) => {
					onMessage({
						content: Buffer.from(JSON.stringify({ userId: "u1", notificationId: "n1" })),
					})
					return Promise.resolve()
				}),
				ack: vi.fn(),
			}
			await setupFn(fakeChannel)

			expect(fakeChannel.assertExchange).toHaveBeenCalledWith("notificationBroadcast", "fanout", { durable: false })
			expect(fakeChannel.assertQueue).toHaveBeenCalledWith("", { exclusive: true, autoDelete: true })
			expect(fakeChannel.bindQueue).toHaveBeenCalledWith("amq.gen-xyz", "notificationBroadcast", "")
			expect(sseManager.send).toHaveBeenCalledWith("u1", { type: "notification", payload: { userId: "u1", notificationId: "n1" } })
			expect(fakeChannel.ack).toHaveBeenCalled()
		})

		it("should redeclare exchange, queue and bind when setup runs again after a simulated reconnect", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const subscriber = new NotificationBroadcastSubscriber(sseManager, makeMockLogger())
			await subscriber.start()

			const setupFn = mockConnection.createChannel.mock.calls[0][0].setup
			const makeFakeChannel = () => ({
				assertExchange: vi.fn().mockResolvedValue(undefined),
				assertQueue: vi.fn().mockResolvedValue({ queue: "amq.gen-xyz" }),
				bindQueue: vi.fn().mockResolvedValue(undefined),
				consume: vi.fn().mockResolvedValue(undefined),
				ack: vi.fn(),
			})

			// amqp-connection-manager invoca `setup` de novo a cada reconexão de TCP; a segunda
			// chamada precisa redeclarar exchange/fila/bind do zero na nova conexão do broker.
			const firstChannel = makeFakeChannel()
			await setupFn(firstChannel)
			const reconnectedChannel = makeFakeChannel()
			await setupFn(reconnectedChannel)

			expect(reconnectedChannel.assertExchange).toHaveBeenCalledWith("notificationBroadcast", "fanout", { durable: false })
			expect(reconnectedChannel.assertQueue).toHaveBeenCalledWith("", { exclusive: true, autoDelete: true })
			expect(reconnectedChannel.bindQueue).toHaveBeenCalledWith("amq.gen-xyz", "notificationBroadcast", "")
		})

		it("should log and ack without crashing when a malformed message is consumed", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const logger = makeMockLogger()
			const subscriber = new NotificationBroadcastSubscriber(sseManager, logger)
			await subscriber.start()

			const setupFn = mockConnection.createChannel.mock.calls[0][0].setup
			const fakeChannel = {
				assertExchange: vi.fn().mockResolvedValue(undefined),
				assertQueue: vi.fn().mockResolvedValue({ queue: "amq.gen-xyz" }),
				bindQueue: vi.fn().mockResolvedValue(undefined),
				consume: vi.fn((_queue, onMessage) => {
					onMessage({ content: Buffer.from("not-json") })
					return Promise.resolve()
				}),
				ack: vi.fn(),
			}

			await expect(setupFn(fakeChannel)).resolves.not.toThrow()
			expect(sseManager.send).not.toHaveBeenCalled()
			expect(fakeChannel.ack).toHaveBeenCalled()
			expect(logger.error).toHaveBeenCalled()
		})
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- -t "NotificationBroadcastSubscriber"`
Expected: FAIL (módulo não existe).

- **Step 3: Write minimal implementation**

```typescript
import amqp, { type ChannelWrapper } from "amqp-connection-manager"
import type { Channel, ConsumeMessage } from "amqplib"
import { inject, injectable } from "inversify"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import { env } from "@/shared/infra/env"
import type { Logger } from "@/shared/infra/logger/logger"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { SseManager } from "./sse-manager"

@injectable()
export class NotificationBroadcastSubscriber {
	private channelWrapper?: ChannelWrapper

	constructor(
		@inject(NOTIFICATION_TYPES.Infra.SseManager) private readonly sseManager: SseManager,
		@inject(SHARED_TYPES.Logger) private readonly logger: Logger,
	) {}

	public async start(): Promise<void> {
		const connection = amqp.connect([env.AMQP_URL])
		this.channelWrapper = connection.createChannel({
			setup: async (channel: Channel) => {
				await channel.assertExchange(EXCHANGES.NOTIFICATION_BROADCAST, "fanout", { durable: false })
				const { queue } = await channel.assertQueue("", { exclusive: true, autoDelete: true })
				await channel.bindQueue(queue, EXCHANGES.NOTIFICATION_BROADCAST, "")
				await channel.consume(queue, (msg: ConsumeMessage | null) => {
					if (!msg) return
					try {
						const payload = JSON.parse(msg.content.toString())
						this.sseManager.send(payload.userId, { type: "notification", payload })
					} catch (error) {
						// mensagem malformada não deve ser reenfileirada em loop — loga e faz ack mesmo assim.
						this.logger.error(this, { exchange: EXCHANGES.NOTIFICATION_BROADCAST, error })
					} finally {
						channel.ack(msg)
					}
				})
			},
		})
		await this.channelWrapper.waitForConnect()
	}

	public async stop(): Promise<void> {
		await this.channelWrapper?.close()
	}
}
```

Nota: `SseManager` já é `@injectable()` e importado como classe concreta (não há interface
separada) — importar de `./sse-manager` (mesmo diretório `infra/sse`, path relativo
`../sse/sse-manager` a partir de `infra/queue/`).

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test:run -- -t "NotificationBroadcastSubscriber"`
Expected: PASS (os 4 testes).

- **Step 5: Registrar no container**

Em `notification-module.ts`, importar `NotificationBroadcastSubscriber` de
`@/notification/infra/queue/notification-broadcast-subscriber` e adicionar:

```typescript
bind(NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber)
	.to(NotificationBroadcastSubscriber)
	.inSingletonScope()
```

- **Step 6: Verificar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS.

- **Step 7: Commit**

```bash
git add apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.ts apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.test.ts apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts
git commit -m "feat(notification): adiciona NotificationBroadcastSubscriber com amqp-connection-manager"
```

## Critérios de Sucesso

- Os 4 testes novos passam (declaração via `setup`, forward ao `SseManager`, redeclaração após
  reconexão simulada, e resiliência a mensagem malformada).
- `logger.error` é chamado (e a mensagem é `ack`eada, não reenfileirada) quando o payload consumido
  não é JSON válido.
- Binding Inversify presente em `notification-module.ts`.
- `tsc:check` limpo.
- API real de `amqp-connection-manager@5.0.0` confirmada via `context7` no Step 0 — imports/tipos
  ajustados caso a lib publicada difira ligeiramente do assumido no Step 3.
