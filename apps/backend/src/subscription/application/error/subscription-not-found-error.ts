import { DomainError } from "@/shared/domain/error/domain-error.js"

export class SubscriptionNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor() {
		super("Subscription not found")
		this.name = "SubscriptionNotFoundError"
	}
}
