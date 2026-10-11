export class GymNotPersistedError extends Error {
	constructor(id: string) {
		super(`Gym not persisted: ${id}`)
		this.name = "GymNotPersistedError"
	}
}
