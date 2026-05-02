import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { USER_TYPES } from "@/shared/infra/ioc/types.js"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository.js"
import type { SubscriptionRepository } from "../../repository/subscription-repository.js"
import { SubscriptionNotFoundError } from "../error/subscription-not-found-error.js"

export interface HandlePaymentFailedUseCaseInput {
	customerId: string
}

export type HandlePaymentFailedUseCaseOutput = Either<
	SubscriptionNotFoundError,
	null
>

@injectable()
export class HandlePaymentFailedUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {}

	public async execute(
		input: HandlePaymentFailedUseCaseInput,
		tx?: object,
	): Promise<HandlePaymentFailedUseCaseOutput> {
		const subscriptionRepo = this.subscriptionRepo(tx)
		const userRepo = this.userRepo(tx)
		const subscription = await subscriptionRepo.ofCustomerId(input.customerId)
		if (!subscription) return failure(new SubscriptionNotFoundError())
		const user = await userRepo.userOfId(subscription.userId)
		if (!user) {
			throw new Error(
				`User ${subscription.userId} not found for subscription ${subscription.id}`,
			)
		}
		subscription.markAsPastDue()
		user.suspend()
		await subscriptionRepo.update(subscription)
		await userRepo.update(user)
		return success(null)
	}

	private subscriptionRepo(tx?: object): SubscriptionRepository {
		return tx
			? this.subscriptionRepository.withTransaction(tx)
			: this.subscriptionRepository
	}

	private userRepo(tx?: object): UserRepository {
		return tx ? this.userRepository.withTransaction(tx) : this.userRepository
	}
}
