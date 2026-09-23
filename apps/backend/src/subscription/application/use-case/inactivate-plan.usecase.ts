import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { Plan } from "@/subscription/domain/plan"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export type InactivatePlanUseCaseOutput = Either<PlanNotFoundError, Plan>

@injectable()
export class InactivatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(id: string): Promise<InactivatePlanUseCaseOutput> {
		const existing = await this.planRepository.planOfId(id)
		if (!existing) return failure(new PlanNotFoundError())

		const inactivated = existing.inactivate()
		await this.planRepository.update(inactivated)
		return success(inactivated)
	}
}
