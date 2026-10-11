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
import { SubscriptionNotFoundError } from "@/shared/infra/errors/subscription-not-found-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionStatusTypes } from "@/subscription/domain/subscription-status-types"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

export type SubscriptionDocument = {
	_id: string
	user_id: string
	billing_subscription_id: string
	customer_id: string
	status: SubscriptionStatusTypes
	canceled_at: Date | null
	created_at: Date
	updated_at: Date
	plan_id: string | null
	current_period_start: Date
	current_period_end: Date
	cancel_at_period_end: boolean
}

@injectable()
export class MongoSubscriptionRepository implements SubscriptionRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): SubscriptionRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoSubscriptionRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(subscription: Subscription): Promise<void> {
		try {
			await this.subscriptions().insertOne(
				{
					_id: subscription.id,
					user_id: subscription.userId,
					billing_subscription_id: subscription.billingSubscriptionId,
					customer_id: subscription.customerId,
					status: subscription.status,
					canceled_at: subscription.canceledAt ?? null,
					created_at: subscription.createdAt,
					updated_at: new Date(),
					plan_id: subscription.planId ?? null,
					current_period_start: subscription.currentPeriodStart,
					current_period_end: subscription.currentPeriodEnd,
					cancel_at_period_end: subscription.cancelAtPeriodEnd,
				},
				sessionOptions(this.session),
			)
		} catch (error) {
			throw this.translateSaveError(error)
		}
	}

	public async update(subscription: Subscription): Promise<void> {
		const result = await this.subscriptions().updateOne(
			{ _id: subscription.id },
			{
				$set: {
					status: subscription.status,
					plan_id: subscription.planId ?? null,
					cancel_at_period_end: subscription.cancelAtPeriodEnd,
					canceled_at: subscription.canceledAt ?? null,
					updated_at: subscription.updatedAt ?? new Date(),
				},
			},
			sessionOptions(this.session),
		)
		if (result.matchedCount === 0) {
			throw new SubscriptionNotFoundError(subscription.id)
		}
	}

	public async ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null> {
		const document = await this.subscriptions().findOne(
			{ billing_subscription_id: billingSubscriptionId },
			sessionOptions(this.session),
		)
		return document ? this.restore(document) : null
	}

	public async ofCustomerId(customerId: string): Promise<Subscription | null> {
		const document = await this.subscriptions().findOne(
			{ customer_id: customerId },
			sessionOptions(this.session),
		)
		return document ? this.restore(document) : null
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		const document = await this.subscriptions().findOne(
			{ user_id: userId, status: "active" },
			sessionOptions(this.session),
		)
		return document ? this.restore(document) : null
	}

	private translateSaveError(error: unknown): unknown {
		const violatesActiveSubscription =
			isDuplicateKeyError(error) &&
			duplicateKeyFields(error).includes("user_id")
		return violatesActiveSubscription
			? new ActiveSubscriptionAlreadyExistsError({ cause: error })
			: error
	}

	private subscriptions(): Collection<SubscriptionDocument> {
		return this.connection.collection<SubscriptionDocument>(
			COLLECTIONS.SUBSCRIPTIONS,
		)
	}

	private restore(document: SubscriptionDocument): Subscription {
		return Subscription.restore({
			id: document._id,
			userId: document.user_id,
			billingSubscriptionId: document.billing_subscription_id,
			customerId: document.customer_id,
			status: document.status,
			planId: document.plan_id ?? undefined,
			currentPeriodStart: document.current_period_start,
			currentPeriodEnd: document.current_period_end,
			cancelAtPeriodEnd: document.cancel_at_period_end,
			canceledAt: document.canceled_at ?? undefined,
			createdAt: document.created_at,
			updatedAt: document.updated_at,
		})
	}
}
