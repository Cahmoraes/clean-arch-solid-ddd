export class InvalidResetTokenError extends Error {
	constructor() {
		super("Invalid or expired password reset token")
		this.name = "InvalidResetTokenError"
	}
}
