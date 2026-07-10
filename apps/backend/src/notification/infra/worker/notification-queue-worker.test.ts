import { describe, expect, it, vi } from "vitest"

import type { NotificationBroadcastPublisher } from "@/notification/infra/queue/notification-broadcast-publisher.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import { QUEUES } from "@/shared/infra/queue/queues.js"
import { NotificationQueueWorker } from "./notification-queue-worker.js"

function makeMockQueue(): Queue {
	return {
		connect: vi.fn(),
		publish: vi.fn(),
		consume: vi.fn(),
	}
}

describe("NotificationQueueWorker", () => {
	describe("init", () => {
		it("should publish the consumed payload via NotificationBroadcastPublisher instead of Redis", async () => {
			const queue = makeMockQueue()
			const broadcastPublisher = {
				publish: vi.fn(),
			} as unknown as NotificationBroadcastPublisher
			const worker = new NotificationQueueWorker(queue, broadcastPublisher)

			await worker.init()
			const consumeCallback = (queue.consume as ReturnType<typeof vi.fn>).mock
				.calls[0][1]
			await consumeCallback({ userId: "u1", notificationId: "n1" })

			expect(queue.consume).toHaveBeenCalledWith(
				QUEUES.NOTIFICATION_CREATED,
				expect.any(Function),
			)
			expect(broadcastPublisher.publish).toHaveBeenCalledWith({
				userId: "u1",
				notificationId: "n1",
			})
		})
	})
})
