export class UserIsNotAdminError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("User is not an admin", errorOptions)
		this.name = "UserIsNotAdminError"
	}
}
