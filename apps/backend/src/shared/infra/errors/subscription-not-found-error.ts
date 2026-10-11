export class SubscriptionNotFoundError extends Error {
	constructor(id: string) {
		super(`Subscription not found: ${id}`)
		this.name = "SubscriptionNotFoundError"
	}
}
