export class GymNotFoundError extends Error {
	constructor(id: string) {
		super(`Gym not found: ${id}`)
		this.name = "GymNotFoundError"
	}
}
