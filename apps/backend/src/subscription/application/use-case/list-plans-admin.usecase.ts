import { inject, injectable } from "inversify"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { Plan } from "@/subscription/domain/plan"
import type { PlanRepository } from "../repository/plan-repository"

@injectable()
export class ListPlansAdminUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(): Promise<Plan[]> {
		return this.planRepository.fetchPlans()
	}
}
