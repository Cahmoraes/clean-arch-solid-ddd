/** biome-ignore-all lint/style/noNonNullAssertion: intentionally */
import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import { UserNotFoundError } from "@/user/application/error/user-not-found-error"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"

import type { SubscriptionGateway } from "../../gateway/subscription-gateway"

export interface CreateCustomerInput {
	email: string
	name?: string
	metadata?: Record<string, string>
}

export interface CreateCustomerResponse {
	id: string
	userId: string
	name: string
	email: string
}

export type CreateCustomerOutput = Either<
	UserNotFoundError,
	CreateCustomerResponse
>

@injectable()
export class CreateCustomer {
	constructor(
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {}

	public async execute(
		input: CreateCustomerInput,
	): Promise<CreateCustomerOutput> {
		const userFound = await this.userRepository.userOfEmail(input.email)
		if (!userFound) return failure(new UserNotFoundError())
		const customer = await this.subscriptionGateway.createCustomer({
			email: userFound.email,
			name: userFound.name,
			metadata: { userId: userFound.id! },
		})
		void userFound.assignBillingCustomerId(customer.id)
		console.log({ userFound })
		await this.userRepository.update(userFound)
		console.log("*********************** create customer")
		console.log(userFound)
		return success({
			id: customer.id,
			userId: userFound.id!,
			name: customer.name,
			email: customer.email,
		})
	}
}
