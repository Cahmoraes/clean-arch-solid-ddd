export class GoogleAccountAlreadyLinkedError extends Error {
	constructor() {
		super("This email is already linked to a different Google account")
		this.name = "GoogleAccountAlreadyLinkedError"
	}
}
