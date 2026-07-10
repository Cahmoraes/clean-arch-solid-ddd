import { describe, expect, it, vi } from "vitest"
import type { SseManager } from "@/notification/infra/sse/sse-manager"
import type { Logger } from "@/shared/infra/logger/logger"

// vi.mock é hoisted para o topo do arquivo, então os mocks referenciados
// dentro da factory precisam ser criados via vi.hoisted() — do contrário
// `mockConnection`/`mockChannelWrapper` seriam acessados antes de inicializar.
const { mockConnection } = vi.hoisted(() => {
	const mockChannelWrapper = {
		waitForConnect: vi.fn().mockResolvedValue(undefined),
	}
	const mockConnection = {
		createChannel: vi.fn().mockReturnValue(mockChannelWrapper),
	}
	return { mockConnection }
})
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
			const subscriber = new NotificationBroadcastSubscriber(
				sseManager,
				makeMockLogger(),
			)

			await subscriber.start()

			expect(mockConnection.createChannel).toHaveBeenCalledWith(
				expect.objectContaining({ setup: expect.any(Function) }),
			)
		})

		it("should forward a consumed message to SseManager.send", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const subscriber = new NotificationBroadcastSubscriber(
				sseManager,
				makeMockLogger(),
			)
			await subscriber.start()

			// Usa a última chamada (não a [0]) porque os mocks de módulo são
			// compartilhados entre testes: cada `start()` acumula uma nova
			// entrada em `mock.calls`, e a closure de `setup` é específica da
			// instância do subscriber criada neste teste.
			const setupFn = mockConnection.createChannel.mock.calls.at(-1)?.[0].setup
			const fakeChannel = {
				assertExchange: vi.fn().mockResolvedValue(undefined),
				assertQueue: vi.fn().mockResolvedValue({ queue: "amq.gen-xyz" }),
				bindQueue: vi.fn().mockResolvedValue(undefined),
				consume: vi.fn((_queue, onMessage) => {
					onMessage({
						content: Buffer.from(
							JSON.stringify({ userId: "u1", notificationId: "n1" }),
						),
					})
					return Promise.resolve()
				}),
				ack: vi.fn(),
			}
			await setupFn(fakeChannel)

			expect(fakeChannel.assertExchange).toHaveBeenCalledWith(
				"notificationBroadcast",
				"fanout",
				{ durable: false },
			)
			expect(fakeChannel.assertQueue).toHaveBeenCalledWith("", {
				exclusive: true,
				autoDelete: true,
			})
			expect(fakeChannel.bindQueue).toHaveBeenCalledWith(
				"amq.gen-xyz",
				"notificationBroadcast",
				"",
			)
			expect(sseManager.send).toHaveBeenCalledWith("u1", {
				type: "notification",
				payload: { userId: "u1", notificationId: "n1" },
			})
			expect(fakeChannel.ack).toHaveBeenCalled()
		})

		it("should redeclare exchange, queue and bind when setup runs again after a simulated reconnect", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const subscriber = new NotificationBroadcastSubscriber(
				sseManager,
				makeMockLogger(),
			)
			await subscriber.start()

			const setupFn = mockConnection.createChannel.mock.calls.at(-1)?.[0].setup
			const makeFakeChannel = () => ({
				assertExchange: vi.fn().mockResolvedValue(undefined),
				assertQueue: vi.fn().mockResolvedValue({ queue: "amq.gen-xyz" }),
				bindQueue: vi.fn().mockResolvedValue(undefined),
				consume: vi.fn().mockResolvedValue(undefined),
				ack: vi.fn(),
			})

			const firstChannel = makeFakeChannel()
			await setupFn(firstChannel)
			const reconnectedChannel = makeFakeChannel()
			await setupFn(reconnectedChannel)

			expect(reconnectedChannel.assertExchange).toHaveBeenCalledWith(
				"notificationBroadcast",
				"fanout",
				{ durable: false },
			)
			expect(reconnectedChannel.assertQueue).toHaveBeenCalledWith("", {
				exclusive: true,
				autoDelete: true,
			})
			expect(reconnectedChannel.bindQueue).toHaveBeenCalledWith(
				"amq.gen-xyz",
				"notificationBroadcast",
				"",
			)
		})

		it("should log and ack without crashing when a malformed message is consumed", async () => {
			const sseManager = { send: vi.fn() } as unknown as SseManager
			const logger = makeMockLogger()
			const subscriber = new NotificationBroadcastSubscriber(sseManager, logger)
			await subscriber.start()

			const setupFn = mockConnection.createChannel.mock.calls.at(-1)?.[0].setup
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
