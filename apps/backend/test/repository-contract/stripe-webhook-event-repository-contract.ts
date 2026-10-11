import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository"

export interface StripeWebhookEventRepositoryContractContext {
	repository: StripeWebhookEventRepository
	newId(): string
	cleanup(): Promise<void>
}

export function describeStripeWebhookEventRepositoryContract(
	name: string,
	factory: () => Promise<StripeWebhookEventRepositoryContractContext>,
): void {
	describe(`StripeWebhookEventRepository contract (${name})`, () => {
		let context: StripeWebhookEventRepositoryContractContext

		beforeEach(async () => {
			context = await factory()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		it("marks different events as processed", async () => {
			await expect(
				context.repository.markAsProcessed(context.newId(), "invoice.paid"),
			).resolves.toBeUndefined()
			await expect(
				context.repository.markAsProcessed(context.newId(), "invoice.paid"),
			).resolves.toBeUndefined()
		})

		it("INV-07: marking the same event twice fails with DuplicateWebhookEventError", async () => {
			const eventId = context.newId()
			await context.repository.markAsProcessed(eventId, "invoice.paid")

			await expect(
				context.repository.markAsProcessed(eventId, "invoice.paid"),
			).rejects.toBeInstanceOf(DuplicateWebhookEventError)
		})
	})
}
