export class CheckInAlreadyRejectedError extends Error {
	constructor() {
		super("Check-in already rejected")
		this.name = "CheckInAlreadyRejectedError"
	}
}
