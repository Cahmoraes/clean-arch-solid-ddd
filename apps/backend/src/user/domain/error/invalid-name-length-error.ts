export class InvalidNameLengthError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Name must have between 10 and 30 characters", errorOptions)
		this.name = "InvalidNameLengthError"
	}
}
