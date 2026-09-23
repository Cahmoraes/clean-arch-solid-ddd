import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { UnitOfWork } from "@/shared/infra/database/repository/unit-of-work/unit-of-work"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { ActiveSubscriptionAlreadyExistsError } from "../../domain/error/active-subscription-already-exists-error.js"
import type { Plan } from "../../domain/plan"
import { Subscription } from "../../domain/subscription"
import type { SubscriptionStatusTypes } from "../../domain/subscription-status-types"
import type { SubscriptionGateway } from "../../gateway/subscription-gateway"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import type { BillingCustomerNotProvisionedError } from "../error/billing-customer-not-provisioned-error"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export interface CreateSubscriptionUseCaseInput {
	userId: string
	customerId: string
	priceId: string
	paymentMethodId: string
}

export interface CreateSubscriptionUseCaseSuccess {
	subscriptionId: string
	status: SubscriptionStatusTypes
}

export type CreateSubscriptionUseCaseOutput = Either<
	BillingCustomerNotProvisionedError | Error,
	CreateSubscriptionUseCaseSuccess
>

@injectable()
export class CreateSubscriptionUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
		@inject(SHARED_TYPES.UnitOfWork)
		private readonly unitOfWork: UnitOfWork,
	) {}

	public async execute(
		input: CreateSubscriptionUseCaseInput,
		tx?: object,
	): Promise<CreateSubscriptionUseCaseOutput> {
		try {
			const plan = await this.planRepository.planOfStripePriceId(input.priceId)
			if (!plan?.isActive) return failure(new PlanNotFoundError())

			const now = new Date()
			const existing = await this.subscriptionRepo(tx).ofUserId(input.userId)
			const conflict = this.assertNoActiveSubscription(existing, now)
			if (conflict) return conflict

			const subscription = await this.createBilledSubscription(input, plan, now)
			await this.persist(subscription, existing, tx)
			return success({
				subscriptionId: subscription.billingSubscriptionId,
				status: subscription.status,
			})
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}

	private assertNoActiveSubscription(
		existing: Subscription | null,
		now: Date,
	): CreateSubscriptionUseCaseOutput | undefined {
		if (existing && !existing.isExpired(now)) {
			return failure(new ActiveSubscriptionAlreadyExistsError())
		}
		return undefined
	}

	private async createBilledSubscription(
		input: CreateSubscriptionUseCaseInput,
		plan: Plan,
		now: Date,
	): Promise<Subscription> {
		await this.subscriptionGateway.attachPaymentMethodToCustomer({
			customerId: input.customerId,
			paymentMethodId: input.paymentMethodId,
		})
		const subscriptionResponse =
			await this.subscriptionGateway.createSubscription({
				customerId: input.customerId,
				priceId: input.priceId,
				paymentMethodId: input.paymentMethodId,
				metadata: { userId: input.userId },
			})
		return Subscription.create({
			userId: input.userId,
			customerId: input.customerId,
			billingSubscriptionId: subscriptionResponse.subscriptionId,
			status: subscriptionResponse.status,
			planId: plan.id,
			billingPeriod: plan.billingPeriod,
			currentPeriodStart: now,
		})
	}

	private async persist(
		subscription: Subscription,
		expired: Subscription | null,
		tx?: object,
	): Promise<void> {
		const run = async (transaction: object): Promise<void> => {
			const repository =
				this.subscriptionRepository.withTransaction(transaction)
			if (expired) {
				expired.closeExpired()
				await repository.update(expired)
			}
			await repository.save(subscription)
		}
		if (tx) {
			await run(tx)
			return
		}
		await this.unitOfWork.runTransaction(run)
	}

	private subscriptionRepo(tx?: object): SubscriptionRepository {
		return tx
			? this.subscriptionRepository.withTransaction(tx)
			: this.subscriptionRepository
	}
}
