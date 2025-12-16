import { inject, injectable } from "inversify"

import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"

import { Subscription } from "../../domain/subscription"
import type { SubscriptionGateway } from "../../gateway/subscription-gateway"
import type { SubscriptionRepository } from "../../repository/subscription-repository"

export interface CreateSubscriptionUseCaseInput {
	userId: string
	customerId: string
	priceId: string
}

@injectable()
export class CreateSubscriptionUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
	) {}

	public async execute(input: CreateSubscriptionUseCaseInput): Promise<void> {
		const paymentMethodId = await this.subscriptionGateway.createPaymentMethod()
		await this.subscriptionGateway.attachPaymentMethodToCustomer({
			customerId: input.customerId,
			paymentMethodId: paymentMethodId,
		})
		const subscriptionResponse =
			await this.subscriptionGateway.createSubscription({
				...input,
				paymentMethodId,
			})
		const subscription = Subscription.create({
			status: subscriptionResponse.status,
			userId: input.userId,
			billingSubscriptionId: subscriptionResponse.customerId,
			id: subscriptionResponse.subscriptionId,
		})
		await this.subscriptionRepository.save(subscription)
		console.log({ subscriptionResponse, subscription })
	}
}
