export class InvalidGoogleTokenError extends Error {
	constructor() {
		super("Invalid or expired Google token")
		this.name = "InvalidGoogleTokenError"
	}
}
