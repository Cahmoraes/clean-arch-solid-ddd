export class SubscriptionNotPersistedError extends Error {
	constructor(id: string) {
		super(`Subscription not persisted: ${id}`)
		this.name = "SubscriptionNotPersistedError"
	}
}
