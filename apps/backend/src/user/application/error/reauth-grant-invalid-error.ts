export class ReauthGrantInvalidError extends Error {
	constructor() {
		super("Reauth grant is invalid or expired")
		this.name = "ReauthGrantInvalidError"
	}
}
