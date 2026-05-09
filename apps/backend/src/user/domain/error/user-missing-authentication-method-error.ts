export class UserMissingAuthenticationMethodError extends Error {
	constructor() {
		super(
			"User must have at least one authentication method: password or googleId",
		)
		this.name = "UserMissingAuthenticationMethodError"
	}
}
