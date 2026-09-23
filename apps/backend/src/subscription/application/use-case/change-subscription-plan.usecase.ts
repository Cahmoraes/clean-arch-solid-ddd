import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "../../domain/error/no-active-subscription-error.js"
import type { Plan } from "../../domain/plan"
import type { Subscription } from "../../domain/subscription"
import type { SubscriptionGateway } from "../../gateway/subscription-gateway"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import {
	type MySubscriptionView,
	toMySubscriptionView,
} from "../dto/my-subscription-view"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export interface ChangeSubscriptionPlanUseCaseInput {
	userId: string
	priceId: string
}

export type ChangeSubscriptionPlanUseCaseOutput = Either<
	Error,
	MySubscriptionView
>

@injectable()
export class ChangeSubscriptionPlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: ChangeSubscriptionPlanUseCaseInput,
		now: Date = new Date(),
	): Promise<ChangeSubscriptionPlanUseCaseOutput> {
		try {
			const planResult = await this.resolveActivePlan(input.priceId)
			if (planResult.isFailure()) return failure(planResult.value)
			const plan = planResult.value

			const subscriptionResult = await this.resolveChangeableSubscription(
				input.userId,
				now,
			)
			if (subscriptionResult.isFailure()) {
				return failure(subscriptionResult.value)
			}
			const subscription = subscriptionResult.value

			await this.subscriptionGateway.changeSubscriptionPrice({
				billingSubscriptionId: subscription.billingSubscriptionId,
				priceId: input.priceId,
			})

			subscription.changePlan(plan.id, now)
			await this.subscriptionRepository.update(subscription)
			return success(toMySubscriptionView(subscription, plan, now))
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}

	private async resolveActivePlan(
		priceId: string,
	): Promise<Either<PlanNotFoundError, Plan>> {
		const plan = await this.planRepository.planOfStripePriceId(priceId)
		if (!plan?.isActive) return failure(new PlanNotFoundError())
		return success(plan)
	}

	private async resolveChangeableSubscription(
		userId: string,
		now: Date,
	): Promise<Either<NoActiveSubscriptionError, Subscription>> {
		const subscription = await this.subscriptionRepository.ofUserId(userId)
		if (!subscription || subscription.isExpired(now)) {
			return failure(new NoActiveSubscriptionError())
		}
		subscription.assertCanChangePlan()
		return success(subscription)
	}
}
