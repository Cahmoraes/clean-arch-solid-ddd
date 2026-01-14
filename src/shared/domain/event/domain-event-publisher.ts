/**
 * biome-ignore-all lint/style/noNonNullAssertion: existem cláusulas de guarda
 * protegendo acessos indefinidos
 * */
import ExtendedSet from "@cahmoraes93/extended-set"

import type { DomainEvent } from "./domain-event"
import type { EventTypes } from "./events"

export type Subscriber<T> = (event: DomainEvent<T>) => void

export class DomainEventPublisher {
	private static _instance: DomainEventPublisher
	private readonly subscribers: Map<string, ExtendedSet<Subscriber<any>>>

	private constructor() {
		this.subscribers = new Map()
	}

	static get instance(): DomainEventPublisher {
		if (!DomainEventPublisher._instance) {
			DomainEventPublisher._instance = new DomainEventPublisher()
		}
		return DomainEventPublisher._instance
	}

	public subscribe(eventType: EventTypes, subscriber: Subscriber<any>): void {
		if (this.isEventNotSubscribed(eventType)) {
			this.subscribers.set(eventType, new ExtendedSet())
		}
		this.subscribers.get(eventType)?.add(subscriber)
	}

	private isEventNotSubscribed(eventType: EventTypes): boolean {
		return !this.subscribers.has(eventType)
	}

	public unsubscribe(
		eventType: EventTypes,
		subscriber: Subscriber<unknown>,
	): void {
		if (this.isEventNotSubscribed(eventType)) return
		const subscribers = this.subscribers.get(eventType)!
		subscribers.delete(subscriber)
	}

	public publish<T>(domainEvent: DomainEvent<T>): void {
		if (!this.subscribers.has(domainEvent.eventName)) return
		const subscribers = this.subscribers.get(domainEvent.eventName)!
		for (const subscriber of subscribers) {
			subscriber(domainEvent)
		}
	}
}
