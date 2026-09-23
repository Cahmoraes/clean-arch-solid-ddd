import type { Plan } from "@/subscription/domain/plan"

export interface SavePlanResult {
	id: string
}

export interface PlanRepository {
	save(plan: Plan): Promise<SavePlanResult>
	update(plan: Plan): Promise<void>
	planOfId(id: string): Promise<Plan | null>
	planOfStripePriceId(priceId: string): Promise<Plan | null>
	fetchPlans(): Promise<Plan[]>
	fetchActivePlans(): Promise<Plan[]>
	withTransaction<TX extends object>(tx: TX): PlanRepository
}
