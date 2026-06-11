import { inject, injectable } from "inversify"
import type Stripe from "stripe"
import type { UnitOfWork } from "@/shared/infra/database/repository/unit-of-work/unit-of-work.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { Logger as ILogger } from "@/shared/infra/logger/logger.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import { QUEUES } from "@/shared/infra/queue/queues.js"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error.js"
import type { ActivateSubscriptionUseCase } from "@/subscription/application/use-case/activate-subscription.usecase.js"
import type { CancelSubscriptionUseCase } from "@/subscription/application/use-case/cancel-subscription.usecase.js"
import type { HandlePaymentFailedUseCase } from "@/subscription/application/use-case/handle-payment-failed.usecase.js"
import { Subscription } from "@/subscription/domain/subscription.js"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository.js"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository.js"

export type EVENT_TYPE =
	| "customer.subscription.created"
	| "customer.subscription.updated"
	| "customer.subscription.deleted"
	| "invoice.payment_failed"

export interface StripeWebhookQueuePayload {
	eventId: string
	eventType: string
	eventData: Stripe.Event
}

@injectable()
export class StripeWebhookWorker {
	constructor(
		@inject(SHARED_TYPES.Queue) private readonly queue: Queue,
		@inject(SHARED_TYPES.UnitOfWork) private readonly unitOfWork: UnitOfWork,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.StripeWebhookEvent)
		private readonly stripeWebhookEventRepository: StripeWebhookEventRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ActivateSubscription)
		private readonly activateSubscription: ActivateSubscriptionUseCase,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.CancelSubscription)
		private readonly cancelSubscription: CancelSubscriptionUseCase,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.HandlePaymentFailed)
		private readonly handlePaymentFailed: HandlePaymentFailedUseCase,
		@inject(SHARED_TYPES.Logger) private readonly logger: ILogger,
	) {
		this.handler = this.handler.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.queue.consume(QUEUES.STRIPE_WEBHOOK, this.handler)
	}

	private async handler(payload: StripeWebhookQueuePayload): Promise<void> {
		const { eventId, eventType, eventData } = payload
		try {
			await this.unitOfWork.runTransaction(async (tx) => {
				await this.stripeWebhookEventRepository
					.withTransaction(tx)
					.markAsProcessed(eventId, eventType)
				await this.routeEvent(eventType as EVENT_TYPE, eventData, tx)
			})
			this.logger.info(this, { eventId, eventType, status: "processed" })
		} catch (error) {
			if (error instanceof DuplicateWebhookEventError) {
				this.logger.info(this, `Duplicate event ${eventId} ignored`)
				return
			}
			this.logger.error(this, { eventId, eventType, error: String(error) })
		}
	}

	private async routeEvent(
		eventType: EVENT_TYPE,
		eventData: Stripe.Event,
		tx: object,
	): Promise<void> {
		switch (eventType) {
			case "customer.subscription.created":
				return this.handleCreated(eventType, eventData, tx)
			case "customer.subscription.updated":
				return this.handleUpdate(eventType, eventData, tx)
			case "customer.subscription.deleted":
				return this.handleDelete(eventType, eventData, tx)
			case "invoice.payment_failed":
				return this.handleInvoicePaymentFailed(eventType, eventData, tx)
			default:
				this.logger.info(this, `Unknown event type ${eventType} ignored`)
				break
		}
	}

	private async handleCreated(
		eventType: EVENT_TYPE,
		eventData: Stripe.Event,
		tx: object,
	): Promise<void> {
		const stripeSubscription = this.subscriptionFor(eventData)
		const subscriptionRepo = this.subscriptionRepository.withTransaction(tx)
		const existing = await subscriptionRepo.ofBillingSubscriptionId(
			stripeSubscription.id,
		)
		if (existing) {
			this.logger.info(this, {
				eventId: eventData.id,
				eventType,
				status: "subscription_already_exists",
			})
			return
		}
		const customer = stripeSubscription.customer
		const customerId = typeof customer === "string" ? customer : customer?.id
		const userId = stripeSubscription.metadata?.userId
		if (!customerId || !userId) {
			this.logger.warn(this, {
				eventId: eventData.id,
				eventType,
				error: "Missing customerId or metadata.userId in subscription event",
			})
			return
		}
		const subscription = Subscription.create({
			id: stripeSubscription.id,
			userId,
			customerId,
			billingSubscriptionId: stripeSubscription.id,
			status: stripeSubscription.status,
		})
		await subscriptionRepo.save(subscription)
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complexidade do domínio
	private async handleUpdate(
		eventType: EVENT_TYPE,
		eventData: Stripe.Event,
		tx: object,
	): Promise<void> {
		const subscription = this.subscriptionFor(eventData)
		if (subscription.status === "active") {
			const result = await this.activateSubscription.execute(
				{ billingSubscriptionId: subscription.id },
				tx,
			)
			if (result.isFailure()) {
				this.logger.warn(this, {
					eventId: eventData.id,
					eventType,
					error: String(result.value),
				})
			}
		}
		if (subscription.status === "canceled") {
			const result = await this.cancelSubscription.execute(
				{ billingSubscriptionId: subscription.id },
				tx,
			)
			if (result.isFailure()) {
				this.logger.warn(this, {
					eventId: eventData.id,
					eventType,
					error: String(result.value),
				})
			}
		}
	}

	private subscriptionFor(eventData: Stripe.Event): Stripe.Subscription {
		return eventData.data.object as Stripe.Subscription
	}

	private async handleDelete(
		eventType: EVENT_TYPE,
		eventData: Stripe.Event,
		tx: object,
	): Promise<void> {
		const subscription = this.subscriptionFor(eventData)
		const result = await this.cancelSubscription.execute(
			{ billingSubscriptionId: subscription.id },
			tx,
		)
		if (result.isFailure()) {
			this.logger.warn(this, {
				eventId: eventData.id,
				eventType,
				error: String(result.value),
			})
		}
	}

	private async handleInvoicePaymentFailed(
		eventType: EVENT_TYPE,
		eventData: Stripe.Event,
		tx: object,
	): Promise<void> {
		const invoice = this.invoiceFor(eventData)
		const customer = invoice.customer
		const customerId = typeof customer === "string" ? customer : customer?.id
		if (!customerId) {
			this.logger.warn(this, {
				eventId: eventData.id,
				eventType,
				error: "Missing customerId in invoice",
			})
			return
		}
		const result = await this.handlePaymentFailed.execute({ customerId }, tx)
		if (result.isFailure()) {
			this.logger.warn(this, {
				eventId: eventData.id,
				eventType,
				error: String(result.value),
			})
		}
	}
	private invoiceFor(eventData: Stripe.Event): Stripe.Invoice {
		return eventData.data.object as Stripe.Invoice
	}
}
