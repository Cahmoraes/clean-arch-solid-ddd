import { describe, expect, it, vi } from "vitest"
import { RabbitMQAdapter } from "./rabbitmq-adapter"

function makeMockChannel() {
	return {
		assertExchange: vi.fn().mockResolvedValue(undefined),
		publish: vi.fn(),
	}
}

describe("RabbitMQAdapter", () => {
	describe("publish", () => {
		it("should assert exchange as direct and durable by default", async () => {
			const adapter = new RabbitMQAdapter()
			const channel = makeMockChannel()
			// @ts-expect-error acessa campo privado para injetar canal fake no teste
			adapter["_channel"] = channel

			await adapter.publish("some-exchange", { foo: "bar" })

			expect(channel.assertExchange).toHaveBeenCalledWith(
				"some-exchange",
				"direct",
				{
					durable: true,
				},
			)
		})

		it("should assert exchange as fanout and non-durable when explicitly requested", async () => {
			const adapter = new RabbitMQAdapter()
			const channel = makeMockChannel()
			// @ts-expect-error acessa campo privado para injetar canal fake no teste
			adapter["_channel"] = channel

			await adapter.publish(
				"notificationBroadcast",
				{ userId: "u1" },
				"fanout",
				false,
			)

			expect(channel.assertExchange).toHaveBeenCalledWith(
				"notificationBroadcast",
				"fanout",
				{
					durable: false,
				},
			)
		})
	})
})
