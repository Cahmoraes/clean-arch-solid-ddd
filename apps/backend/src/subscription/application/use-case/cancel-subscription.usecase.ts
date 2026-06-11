import { inject, injectable } from "inversify"
import type { Either } from "@/shared/domain/value-object/either.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import type { SubscriptionNotFoundError } from "../error/subscription-not-found-error.js"
import type { SubscriptionLifecycleService } from "../service/subscription-lifecycle.service.js"

export interface CancelSubscriptionUseCaseInput {
	billingSubscriptionId: string
}

export type CancelSubscriptionUseCaseOutput = Either<
	SubscriptionNotFoundError,
	null
>

@injectable()
export class CancelSubscriptionUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.SERVICES.Lifecycle)
		private readonly subscriptionLifecycleService: SubscriptionLifecycleService,
	) {}

	public async execute(
		input: CancelSubscriptionUseCaseInput,
		tx?: object,
	): Promise<CancelSubscriptionUseCaseOutput> {
		return this.subscriptionLifecycleService.cancel(input, tx)
	}
}
