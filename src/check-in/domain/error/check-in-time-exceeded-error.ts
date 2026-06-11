export class CheckInTimeExceededError extends Error {
	constructor() {
		super("Check-in time exceeded")
		this.name = "CheckInTimeExceededError"
	}
}
