import { describe, expect, test } from "vitest"
import { EVENTS } from "@/shared/domain/event/events"
import {
	UserRoleChangedEvent,
	type UserRoleChangedEventProps,
} from "./user-role-changed.event"

describe("UserRoleChangedEvent", () => {
	test("deve criar o evento com o payload, eventName, id e date corretos", () => {
		const props: UserRoleChangedEventProps = {
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousRole: "MEMBER",
			newRole: "ADMIN",
		}

		const event = new UserRoleChangedEvent(props)

		expect(event.payload).toEqual(props)
		expect(event.eventName).toBe(EVENTS.USER_ROLE_CHANGED)
		expect(event.id).toEqual(expect.any(String))
		expect(event.date).toBeInstanceOf(Date)
	})

	test("toJSON deve expor id, eventName, date e payload", () => {
		const event = new UserRoleChangedEvent({
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousRole: "ADMIN",
			newRole: "MEMBER",
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
