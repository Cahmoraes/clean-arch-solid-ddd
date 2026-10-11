export class PlanNotPersistedError extends Error {
	constructor(id: string) {
		super(`Plan not persisted: ${id}`)
		this.name = "PlanNotPersistedError"
	}
}
