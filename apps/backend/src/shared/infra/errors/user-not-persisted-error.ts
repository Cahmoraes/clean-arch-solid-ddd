export class UserNotPersistedError extends Error {
	constructor(id: string) {
		super(`User not persisted: ${id}`)
		this.name = "UserNotPersistedError"
	}
}
