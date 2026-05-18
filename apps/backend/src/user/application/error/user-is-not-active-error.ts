export class UserIsNotActiveError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("User account is not active", errorOptions)
		this.name = "UserIsNotActiveError"
	}
}
