export class SubscriptionNotFoundError extends Error {
	constructor() {
		super("Subscription not found")
		this.name = "SubscriptionNotFoundError"
	}
}
