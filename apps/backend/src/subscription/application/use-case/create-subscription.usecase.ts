import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { Subscription } from "../../domain/subscription"
import type { SubscriptionStatusTypes } from "../../domain/subscription-status-types"
import type { SubscriptionGateway } from "../../gateway/subscription-gateway"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import type { BillingCustomerNotProvisionedError } from "../error/billing-customer-not-provisioned-error"

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
	) {}

	public async execute(
		input: CreateSubscriptionUseCaseInput,
		tx?: object,
	): Promise<CreateSubscriptionUseCaseOutput> {
		try {
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
			const subscription = Subscription.create({
				userId: input.userId,
				customerId: input.customerId,
				billingSubscriptionId: subscriptionResponse.subscriptionId,
				status: subscriptionResponse.status,
			})
			await this.subscriptionRepo(tx).save(subscription)
			return success({
				subscriptionId: subscription.billingSubscriptionId,
				status: subscription.status,
			})
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}

	private subscriptionRepo(tx?: object): SubscriptionRepository {
		return tx
			? this.subscriptionRepository.withTransaction(tx)
			: this.subscriptionRepository
	}
}
