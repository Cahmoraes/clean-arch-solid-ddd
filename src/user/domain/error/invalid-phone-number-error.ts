export class InvalidPhoneNumberError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Invalid phone number", errorOptions)
		this.name = "InvalidPhoneNumberError"
	}
}
