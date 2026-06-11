import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { CheckInApprovedEvent } from "@/check-in/domain/event/check-in-approved-event"
import { CheckInRejectedEvent } from "@/check-in/domain/event/check-in-rejected-event"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"

import { CreateNotificationOnCheckInEventHandler } from "./create-notification-on-check-in-event.handler"

const mockQueue = {
	connect: vi.fn(),
	publish: vi.fn().mockResolvedValue(undefined),
	consume: vi.fn(),
}

describe("CreateNotificationOnCheckInEventHandler", () => {
	let repository: InMemoryNotificationRepository
	let handler: CreateNotificationOnCheckInEventHandler

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		handler = new CreateNotificationOnCheckInEventHandler(
			repository,
			mockQueue as never,
		)
		handler.subscribe()
	})

	afterEach(() => {
		handler.unsubscribe()
		vi.clearAllMocks()
	})

	test("should create CHECK_IN_APPROVED notification when CheckInApprovedEvent is published", async () => {
		await DomainEventPublisher.instance.publish(
			new CheckInApprovedEvent({
				checkInId: "ci-1",
				userId: "user-1",
				gymId: "gym-1",
			}),
		)

		expect(repository.notifications.size).toBe(1)
		const notification = repository.notifications.toArray()[0]
		expect(notification.userId).toBe("user-1")
		expect(notification.type).toBe("CHECK_IN_APPROVED")
	})

	test("should create CHECK_IN_REJECTED notification when CheckInRejectedEvent is published", async () => {
		await DomainEventPublisher.instance.publish(
			new CheckInRejectedEvent({
				checkInId: "ci-1",
				userId: "user-1",
				gymId: "gym-1",
			}),
		)

		expect(repository.notifications.size).toBe(1)
		const notification = repository.notifications.toArray()[0]
		expect(notification.userId).toBe("user-1")
		expect(notification.type).toBe("CHECK_IN_REJECTED")
	})

	test("should publish to NOTIFICATION_CREATED exchange after saving", async () => {
		await DomainEventPublisher.instance.publish(
			new CheckInApprovedEvent({
				checkInId: "ci-1",
				userId: "user-1",
				gymId: "gym-1",
			}),
		)

		expect(mockQueue.publish).toHaveBeenCalledOnce()
		const [exchange, payload] = mockQueue.publish.mock.calls[0]
		expect(exchange).toBe("notificationCreated")
		expect(payload).toMatchObject({
			notificationId: expect.any(String),
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
		})
	})

	test("should not handle other events", async () => {
		await DomainEventPublisher.instance.publish({
			eventName: EVENTS.CHECK_IN_CREATED,
			id: "x",
			date: new Date(),
			payload: {},
			toJSON: () => ({}),
		} as never)

		expect(repository.notifications.size).toBe(0)
	})
})
