export class UserIsSuperAdminError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Cannot modify the super admin account", errorOptions)
		this.name = "UserIsSuperAdminError"
	}
}
