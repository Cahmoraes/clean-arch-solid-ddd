import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import {
	type MySubscriptionView,
	toMySubscriptionView,
} from "../dto/my-subscription-view"
import type { PlanRepository } from "../repository/plan-repository"

export interface GetMySubscriptionUseCaseInput {
	userId: string
}

export type GetMySubscriptionUseCaseOutput = Either<
	Error,
	MySubscriptionView | null
>

@injectable()
export class GetMySubscriptionUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: GetMySubscriptionUseCaseInput,
		now: Date = new Date(),
	): Promise<GetMySubscriptionUseCaseOutput> {
		try {
			const subscription = await this.subscriptionRepository.ofUserId(
				input.userId,
			)
			if (!subscription) return success(null)
			const plan = subscription.planId
				? await this.planRepository.planOfId(subscription.planId)
				: null
			return success(toMySubscriptionView(subscription, plan, now))
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}
}
