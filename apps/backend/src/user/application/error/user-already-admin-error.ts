export class UserAlreadyAdminError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("User is already an admin", errorOptions)
		this.name = "UserAlreadyAdminError"
	}
}
