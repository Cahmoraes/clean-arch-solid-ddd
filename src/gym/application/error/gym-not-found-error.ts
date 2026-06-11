export class GymNotFoundError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Gym not found", errorOptions)
		this.name = "GymNotFoundError"
	}
}
