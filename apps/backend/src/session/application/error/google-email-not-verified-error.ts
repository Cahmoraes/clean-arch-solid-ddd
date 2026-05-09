export class GoogleEmailNotVerifiedError extends Error {
	constructor() {
		super("Google email is not verified")
		this.name = "GoogleEmailNotVerifiedError"
	}
}
