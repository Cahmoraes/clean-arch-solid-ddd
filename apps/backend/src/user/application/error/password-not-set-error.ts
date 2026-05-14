export class PasswordNotSetError extends Error {
	constructor() {
		super("Password not set for this account")
		this.name = "PasswordNotSetError"
	}
}
