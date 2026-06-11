import { afterEach, describe, expect, test, vi } from "vitest"

import { CheckIn } from "@/check-in/domain/check-in"
import { CheckInApprovedEvent } from "@/check-in/domain/event/check-in-approved-event"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"

function makePendingCheckIn() {
	return CheckIn.create({
		id: "check-in-id",
		userId: "user-id",
		gymId: "gym-id",
		userLatitude: 0,
		userLongitude: 0,
	})
}

describe("CheckInStatus", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("validate()", () => {
		test("deve publicar CheckInApprovedEvent após validar um check-in pendente", async () => {
			const checkIn = makePendingCheckIn()

			const publishSpy = vi.spyOn(DomainEventPublisher.instance, "publish")

			checkIn.validate()

			expect(publishSpy).toHaveBeenCalledOnce()
			const publishedEvent = publishSpy.mock.calls[0][0]
			expect(publishedEvent).toBeInstanceOf(CheckInApprovedEvent)
			expect(publishedEvent.eventName).toBe(EVENTS.CHECK_IN_APPROVED)
			expect(publishedEvent.payload).toEqual({
				checkInId: "check-in-id",
				userId: "user-id",
				gymId: "gym-id",
			})
		})

		test("não deve publicar CheckInApprovedEvent ao validar check-in já validado", () => {
			const checkIn = makePendingCheckIn()
			checkIn.validate()

			const publishSpy = vi.spyOn(DomainEventPublisher.instance, "publish")

			checkIn.validate()

			expect(publishSpy).not.toHaveBeenCalled()
		})

		test("não deve publicar CheckInApprovedEvent ao validar check-in rejeitado", () => {
			const checkIn = makePendingCheckIn()
			checkIn.reject()

			const publishSpy = vi.spyOn(DomainEventPublisher.instance, "publish")

			checkIn.validate()

			expect(publishSpy).not.toHaveBeenCalled()
		})
	})
})
