import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import type { ClientSession, Collection } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository"

export type StripeWebhookEventDocument = {
	_id: string
	event_id: string
	event_type: string
	processed_at: Date
}

@injectable()
export class MongoStripeWebhookEventRepository
	implements StripeWebhookEventRepository
{
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(
		tx: TX,
	): StripeWebhookEventRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoStripeWebhookEventRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async markAsProcessed(
		eventId: string,
		eventType: string,
	): Promise<void> {
		try {
			await this.events().insertOne(
				{
					_id: randomUUID(),
					event_id: eventId,
					event_type: eventType,
					processed_at: new Date(),
				},
				sessionOptions(this.session),
			)
		} catch (error) {
			if (
				isDuplicateKeyError(error) &&
				duplicateKeyFields(error).includes("event_id")
			) {
				throw new DuplicateWebhookEventError(eventId)
			}
			throw error
		}
	}

	private events(): Collection<StripeWebhookEventDocument> {
		return this.connection.collection<StripeWebhookEventDocument>(
			COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
		)
	}
}
