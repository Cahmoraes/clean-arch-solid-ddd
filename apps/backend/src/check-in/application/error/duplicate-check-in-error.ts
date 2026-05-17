export class DuplicateCheckInError extends Error {
	constructor() {
		super("User already has a check-in today")
		this.name = "DuplicateCheckInError"
	}
}
