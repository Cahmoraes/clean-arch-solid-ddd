export class InvalidEmailError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Invalid email format", errorOptions)
		this.name = "InvalidEmailError"
	}
}
