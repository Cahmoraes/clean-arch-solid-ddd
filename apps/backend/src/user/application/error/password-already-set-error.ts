export class PasswordAlreadySetError extends Error {
	constructor() {
		super("Password already set for this account")
		this.name = "PasswordAlreadySetError"
	}
}
