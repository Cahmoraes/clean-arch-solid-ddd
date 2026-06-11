import { injectable } from "inversify"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error.js"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository.js"

@injectable()
export class InMemoryStripeWebhookEventRepository
	implements StripeWebhookEventRepository
{
	public processedEvents: Set<string> = new Set()

	public async markAsProcessed(
		eventId: string,
		_eventType: string,
	): Promise<void> {
		if (this.processedEvents.has(eventId)) {
			throw new DuplicateWebhookEventError(eventId)
		}
		this.processedEvents.add(eventId)
	}

	public withTransaction<TX extends object>(
		_tx: TX,
	): StripeWebhookEventRepository {
		return this
	}
}
