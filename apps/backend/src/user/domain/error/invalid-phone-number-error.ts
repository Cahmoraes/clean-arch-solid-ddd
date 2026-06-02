import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidPhoneNumberError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Invalid phone number", errorOptions)
		this.name = "InvalidPhoneNumberError"
	}
}
