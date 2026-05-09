import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { USER_TYPES } from "@/shared/infra/ioc/types.js"
import type { Subscription } from "@/subscription/domain/subscription.js"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository.js"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository.js"
import type { User } from "@/user/domain/user.js"
import { SubscriptionNotFoundError } from "../error/subscription-not-found-error.js"

export interface SubscriptionLifecycleService {
	activate(
		input: { billingSubscriptionId: string },
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>>
	cancel(
		input: { billingSubscriptionId: string },
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>>
	handlePaymentFailed(
		input: { customerId: string },
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>>
}

interface LifecycleOperation {
	findSubscription(
		subscriptionRepository: SubscriptionRepository,
	): Promise<Subscription | null>
	mutate(subscription: Subscription, user: User): void
}

@injectable()
export class SubscriptionLifecycleServiceImpl
	implements SubscriptionLifecycleService
{
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {}

	public async activate(
		input: { billingSubscriptionId: string },
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>> {
		return this.executeLifecycle(
			{
				findSubscription: (subscriptionRepository) =>
					subscriptionRepository.ofBillingSubscriptionId(
						input.billingSubscriptionId,
					),
				mutate: (subscription, user) => {
					subscription.activate()
					user.activate()
				},
			},
			tx,
		)
	}

	public async cancel(
		input: { billingSubscriptionId: string },
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>> {
		return this.executeLifecycle(
			{
				findSubscription: (subscriptionRepository) =>
					subscriptionRepository.ofBillingSubscriptionId(
						input.billingSubscriptionId,
					),
				mutate: (subscription, user) => {
					subscription.cancel()
					user.suspend()
				},
			},
			tx,
		)
	}

	public async handlePaymentFailed(
		input: { customerId: string },
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>> {
		return this.executeLifecycle(
			{
				findSubscription: (subscriptionRepository) =>
					subscriptionRepository.ofCustomerId(input.customerId),
				mutate: (subscription, user) => {
					subscription.markAsPastDue()
					user.suspend()
				},
			},
			tx,
		)
	}

	private async executeLifecycle(
		operation: LifecycleOperation,
		tx?: object,
	): Promise<Either<SubscriptionNotFoundError, null>> {
		const { subscriptionRepository, userRepository } = this.repositories(tx)
		const subscription = await operation.findSubscription(
			subscriptionRepository,
		)
		if (!subscription) return failure(new SubscriptionNotFoundError())

		const user = await userRepository.userOfId(subscription.userId)
		if (!user) {
			throw new Error(
				`User ${subscription.userId} not found for subscription ${subscription.id}`,
			)
		}

		operation.mutate(subscription, user)
		await subscriptionRepository.update(subscription)
		await userRepository.update(user)

		return success(null)
	}

	private repositories(tx?: object): {
		subscriptionRepository: SubscriptionRepository
		userRepository: UserRepository
	} {
		return {
			subscriptionRepository: tx
				? this.subscriptionRepository.withTransaction(tx)
				: this.subscriptionRepository,
			userRepository: tx
				? this.userRepository.withTransaction(tx)
				: this.userRepository,
		}
	}
}
