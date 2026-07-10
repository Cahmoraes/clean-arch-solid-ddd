import { randomUUID } from "node:crypto"
import { connect } from "amqp-connection-manager"
import type { SseManager } from "@/notification/infra/sse/sse-manager"
import type { Logger } from "@/shared/infra/logger/logger"
import { RabbitMQAdapter } from "@/shared/infra/queue/rabbitmq-adapter"
import { NotificationBroadcastPublisher } from "./notification-broadcast-publisher"
import { NotificationBroadcastSubscriber } from "./notification-broadcast-subscriber"

function makeFakeLogger(): Logger {
	return { info: () => {}, warn: () => {}, error: () => {} }
}

async function waitFor(
	predicate: () => boolean,
	timeoutMs = 3000,
	stepMs = 50,
): Promise<void> {
	const deadline = Date.now() + timeoutMs
	while (!predicate()) {
		if (Date.now() > deadline) return
		await new Promise((resolve) => setTimeout(resolve, stepMs))
	}
}

describe("Notification broadcast fanout (integração real com RabbitMQ)", () => {
	let publisherAdapter: RabbitMQAdapter

	beforeAll(async () => {
		publisherAdapter = new RabbitMQAdapter()
		await publisherAdapter.connect()
	})

	afterAll(async () => {
		await publisherAdapter.close()
	})

	it("deve entregar o mesmo payload de broadcast para duas instâncias assinantes independentes", async () => {
		const receivedByInstanceA: unknown[] = []
		const receivedByInstanceB: unknown[] = []
		const sseManagerA = {
			send: (_userId: string, data: unknown) => receivedByInstanceA.push(data),
		} as unknown as SseManager
		const sseManagerB = {
			send: (_userId: string, data: unknown) => receivedByInstanceB.push(data),
		} as unknown as SseManager

		const subscriberA = new NotificationBroadcastSubscriber(
			sseManagerA,
			makeFakeLogger(),
			connect,
		)
		const subscriberB = new NotificationBroadcastSubscriber(
			sseManagerB,
			makeFakeLogger(),
			connect,
		)
		await subscriberA.start()
		await subscriberB.start()

		const publisher = new NotificationBroadcastPublisher(
			publisherAdapter,
			makeFakeLogger(),
		)
		const notificationId = randomUUID()
		const userId = randomUUID()
		await publisher.publish({ userId, notificationId })

		await waitFor(
			() => receivedByInstanceA.length > 0 && receivedByInstanceB.length > 0,
		)

		expect(receivedByInstanceA).toHaveLength(1)
		expect(receivedByInstanceB).toHaveLength(1)
		expect(receivedByInstanceA[0]).toEqual({
			type: "notification",
			payload: { userId, notificationId },
		})
		expect(receivedByInstanceB[0]).toEqual({
			type: "notification",
			payload: { userId, notificationId },
		})

		await subscriberA.stop()
		await subscriberB.stop()
	})
})
