import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	PlanRepository,
	SavePlanResult,
} from "@/subscription/application/repository/plan-repository"
import type { Plan } from "@/subscription/domain/plan"

@injectable()
export class InMemoryPlanRepository implements PlanRepository {
	public plans = new ExtendedSet<Plan>()

	public withTransaction(): PlanRepository {
		return this
	}

	public async save(plan: Plan): Promise<SavePlanResult> {
		this.plans.add(plan)
		return { id: plan.id }
	}

	public async update(plan: Plan): Promise<void> {
		const existing = this.plans.find((current) => current.id === plan.id)
		if (existing) this.plans.delete(existing)
		this.plans.add(plan)
	}

	public async planOfId(id: string): Promise<Plan | null> {
		return this.plans.find((plan) => plan.id === id) ?? null
	}

	public async fetchPlans(): Promise<Plan[]> {
		return this.plans.toArray()
	}

	public async fetchActivePlans(): Promise<Plan[]> {
		return this.plans.filter((plan) => plan.isActive).toArray()
	}
}
