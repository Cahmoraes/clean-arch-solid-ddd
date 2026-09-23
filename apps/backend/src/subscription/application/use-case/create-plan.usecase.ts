import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import type { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"
import type { PlanRepository } from "../repository/plan-repository"

export interface CreatePlanUseCaseInput {
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	stripePriceId?: string
}

export type CreatePlanUseCaseOutput = Either<
	InvalidPlanNameError | InvalidPriceError,
	Plan
>

@injectable()
export class CreatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: CreatePlanUseCaseInput,
	): Promise<CreatePlanUseCaseOutput> {
		const planOrError = Plan.create(input)
		if (planOrError.isFailure()) return failure(planOrError.value)

		const plan = planOrError.value
		await this.planRepository.save(plan)
		return success(plan)
	}
}
