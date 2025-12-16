import { randomUUID } from "crypto"

import type { EventTypes } from "./events"

export abstract class DomainEvent<T> {
	readonly id: string
	readonly name: EventTypes
	readonly date: Date
	abstract readonly payload: T

	constructor(eventName: EventTypes) {
		this.id = randomUUID()
		this.name = eventName
		this.date = new Date()
	}
	public abstract toJSON(): any
}
