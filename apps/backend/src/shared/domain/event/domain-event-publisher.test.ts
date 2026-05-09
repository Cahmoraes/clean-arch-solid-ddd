import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event"
import { DomainEventPublisher, type Subscriber } from "./domain-event-publisher"
import type { EventTypes } from "./events"

describe("DomainEventPublisher", () => {
	const cleanups: Array<() => void> = []
	const subscribe = (
		eventType: EventTypes,
		subscriber: Subscriber<unknown>,
	) => {
		DomainEventPublisher.instance.subscribe(eventType, subscriber)
		cleanups.push(() => {
			DomainEventPublisher.instance.unsubscribe(eventType, subscriber)
		})
	}

	afterEach(() => {
		for (const cleanup of cleanups.splice(0)) {
			cleanup()
		}
	})

	test("Deve publicar um event", async () => {
		const event = new UserCreatedEvent({
			email: "user@mail.com",
		})
		const subscriber = vi.fn()
		subscribe("userCreated", subscriber)
		await DomainEventPublisher.instance.publish(event)
		expect(subscriber).toHaveBeenCalledWith(event)
	})

	test("Deve desinscrever um subscriber", () => {
		const subscriber = vi.fn()
		subscribe("userCreated", subscriber)
		DomainEventPublisher.instance.unsubscribe("userCreated", subscriber)
	})

	test("Deve notificar um subscriber por tópico", async () => {
		const userCreatedEvent = new UserCreatedEvent({
			email: "user@mail.com",
		})
		const passwordChangedEvent = new PasswordChangedEvent({
			userName: "any-name",
			userEmail: "user@mail.com",
		})
		const subscriber1 = vi.fn()
		const subscriber2 = vi.fn()
		subscribe("userCreated", subscriber1)
		subscribe("passwordChanged", subscriber2)
		expect(subscriber1).not.toHaveBeenCalled()
		expect(subscriber2).not.toHaveBeenCalled()
		await DomainEventPublisher.instance.publish(userCreatedEvent)
		await DomainEventPublisher.instance.publish(passwordChangedEvent)
		expect(subscriber1).toHaveBeenCalledWith(userCreatedEvent)
		expect(subscriber1).toHaveBeenCalledTimes(1)
		expect(subscriber1).not.toHaveBeenCalledWith(passwordChangedEvent)

		expect(subscriber2).toHaveBeenCalledWith(passwordChangedEvent)
		expect(subscriber2).toHaveBeenCalledTimes(1)
		expect(subscriber2).not.toHaveBeenCalledWith(userCreatedEvent)
	})

	test("Deve isolar erro de um subscriber sem afetar os demais nem propagar", async () => {
		const event = new UserCreatedEvent({ email: "user@mail.com" })
		const failingSubscriber = vi
			.fn()
			.mockRejectedValue(new Error("integração externa falhou"))
		const succeedingSubscriber = vi.fn()
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {})

		subscribe("userCreated", failingSubscriber)
		subscribe("userCreated", succeedingSubscriber)

		await expect(
			DomainEventPublisher.instance.publish(event),
		).resolves.toBeUndefined()
		expect(failingSubscriber).toHaveBeenCalledWith(event)
		expect(succeedingSubscriber).toHaveBeenCalledWith(event)
		expect(consoleErrorSpy).toHaveBeenCalled()

		consoleErrorSpy.mockRestore()
	})
})
