import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "../../domain/error/no-active-subscription-error.js"
import type { Subscription } from "../../domain/subscription"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import {
	type MySubscriptionView,
	toMySubscriptionView,
} from "../dto/my-subscription-view"
import type { PlanRepository } from "../repository/plan-repository"

export interface ScheduleSubscriptionCancellationUseCaseInput {
	userId: string
}

export type ScheduleSubscriptionCancellationUseCaseOutput = Either<
	Error,
	MySubscriptionView
>

@injectable()
export class ScheduleSubscriptionCancellationUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: ScheduleSubscriptionCancellationUseCaseInput,
		now: Date = new Date(),
	): Promise<ScheduleSubscriptionCancellationUseCaseOutput> {
		try {
			const subscriptionResult = await this.resolveActiveSubscription(
				input.userId,
				now,
			)
			if (subscriptionResult.isFailure())
				return failure(subscriptionResult.value)
			const subscription = subscriptionResult.value

			subscription.scheduleCancellation(now)
			await this.subscriptionRepository.update(subscription)
			const plan = subscription.planId
				? await this.planRepository.planOfId(subscription.planId)
				: null
			return success(toMySubscriptionView(subscription, plan, now))
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}

	private async resolveActiveSubscription(
		userId: string,
		now: Date,
	): Promise<Either<NoActiveSubscriptionError, Subscription>> {
		const subscription = await this.subscriptionRepository.ofUserId(userId)
		if (!subscription || subscription.isExpired(now)) {
			return failure(new NoActiveSubscriptionError())
		}
		return success(subscription)
	}
}
