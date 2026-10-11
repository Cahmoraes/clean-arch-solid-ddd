export class PlanNotFoundError extends Error {
	constructor(id: string) {
		super(`Plan not found: ${id}`)
		this.name = "PlanNotFoundError"
	}
}
