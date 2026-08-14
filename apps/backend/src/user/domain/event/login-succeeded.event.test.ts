import { describe, expect, test } from "vitest"
import { EVENTS } from "@/shared/domain/event/events"
import {
	LoginSucceededEvent,
	type LoginSucceededEventProps,
} from "./login-succeeded.event"

describe("LoginSucceededEvent", () => {
	test("deve criar o evento com o payload, eventName, id e date corretos", () => {
		const props: LoginSucceededEventProps = {
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
		}

		const event = new LoginSucceededEvent(props)

		expect(event.payload).toEqual(props)
		expect(event.eventName).toBe(EVENTS.LOGIN_SUCCEEDED)
		expect(event.id).toEqual(expect.any(String))
		expect(event.date).toBeInstanceOf(Date)
	})

	test("toJSON deve expor id, eventName, date e payload", () => {
		const event = new LoginSucceededEvent({
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
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
