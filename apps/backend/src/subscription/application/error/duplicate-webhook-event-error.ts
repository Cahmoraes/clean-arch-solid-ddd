export class DuplicateWebhookEventError extends Error {
	constructor(eventId: string) {
		super(`Webhook event ${eventId} already processed`)
		this.name = "DuplicateWebhookEventError"
	}
}
