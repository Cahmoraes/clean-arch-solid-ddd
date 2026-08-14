import { describe, expect, test } from "vitest"
import { EVENTS } from "@/shared/domain/event/events"
import {
	UserStatusChangedEvent,
	type UserStatusChangedEventProps,
} from "./user-status-changed.event"

describe("UserStatusChangedEvent", () => {
	test("deve criar o evento com o payload, eventName, id e date corretos", () => {
		const props: UserStatusChangedEventProps = {
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousStatus: "activated",
			newStatus: "suspended",
		}

		const event = new UserStatusChangedEvent(props)

		expect(event.payload).toEqual(props)
		expect(event.eventName).toBe(EVENTS.USER_STATUS_CHANGED)
		expect(event.id).toEqual(expect.any(String))
		expect(event.date).toBeInstanceOf(Date)
	})

	test("toJSON deve expor id, eventName, date e payload", () => {
		const event = new UserStatusChangedEvent({
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousStatus: "suspended",
			newStatus: "activated",
		})

		const json = event.toJSON()

		expect(json).toEqual({
			id: event.id,
			eventName: event.eventName,
			date: event.date,
			payload: event.payload,
		})
	})
})
