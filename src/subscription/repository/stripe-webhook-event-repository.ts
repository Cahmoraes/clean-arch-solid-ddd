export interface StripeWebhookEventRepository {
	/**
	 * Persiste o evento como processado.
	 * Lança DuplicateWebhookEventError se o eventId já existir (idempotência).
	 */
	markAsProcessed(eventId: string, eventType: string): Promise<void>
	withTransaction<TX extends object>(tx: TX): StripeWebhookEventRepository
}
