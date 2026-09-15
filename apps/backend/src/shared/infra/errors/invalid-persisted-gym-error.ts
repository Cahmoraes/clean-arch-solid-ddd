export class InvalidPersistedGymError extends Error {
	constructor(gymId: string, cause: Error) {
		super(`Invalid persisted data for gym ${gymId}: ${cause.message}`, {
			cause,
		})
		this.name = "InvalidPersistedGymError"
	}
}
