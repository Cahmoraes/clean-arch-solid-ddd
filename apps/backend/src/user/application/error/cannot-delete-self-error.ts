export class CannotDeleteSelfError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Admin cannot delete their own account", errorOptions)
		this.name = "CannotDeleteSelfError"
	}
}
