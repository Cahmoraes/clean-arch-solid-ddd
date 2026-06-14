import { injectable } from "inversify"
import { DEMO_PLANS, type DemoPlan } from "../../domain/plans.js"

export type ListPlansOutput = ReadonlyArray<DemoPlan>

@injectable()
export class ListPlansUseCase {
	public execute(): ListPlansOutput {
		return DEMO_PLANS
	}
}
