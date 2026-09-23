import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { PlanNotFoundError } from "@/subscription/application/error/plan-not-found-error"
import type { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import type { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"
import type { PlanRepository } from "../repository/plan-repository"

export interface UpdatePlanUseCaseInput {
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	stripePriceId?: string
}

export type UpdatePlanUseCaseOutput = Either<
	PlanNotFoundError | InvalidPlanNameError | InvalidPriceError,
	Plan
>

@injectable()
export class UpdatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		id: string,
		input: UpdatePlanUseCaseInput,
	): Promise<UpdatePlanUseCaseOutput> {
		const existing = await this.planRepository.planOfId(id)
		if (!existing) return failure(new PlanNotFoundError())

		const validatedOrError = Plan.create(input)
		if (validatedOrError.isFailure()) return failure(validatedOrError.value)
		const validated = validatedOrError.value

		// PUT nunca altera isActive (FR-005) — preserva o status atual do plano.
		const plan = Plan.restore({
			id: existing.id,
			name: validated.name,
			priceCents: validated.priceCents,
			billingPeriod: validated.billingPeriod,
			tagline: validated.tagline,
			features: validated.features,
			isActive: existing.isActive,
			stripePriceId: validated.stripePriceId,
		})
		await this.planRepository.update(plan)
		return success(plan)
	}
}
