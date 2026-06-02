import { DomainError } from "@/shared/domain/error/domain-error.js"

export class DuplicateWebhookEventError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(eventId: string) {
		super(`Webhook event ${eventId} already processed`)
		this.name = "DuplicateWebhookEventError"
	}
}
