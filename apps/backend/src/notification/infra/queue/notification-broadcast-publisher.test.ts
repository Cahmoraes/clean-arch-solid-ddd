import { describe, expect, it, vi } from "vitest"
import type { Logger } from "@/shared/infra/logger/logger"
import type { Queue } from "@/shared/infra/queue/queue"
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

			await expect(
				publisher.publish({ userId: "u1", notificationId: "n1" }),
			).rejects.toThrow(publishError)
			expect(logger.error).toHaveBeenCalled()
		})
	})
})
