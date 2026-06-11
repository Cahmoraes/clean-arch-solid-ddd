import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidEmailError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Invalid email format", errorOptions)
		this.name = "InvalidEmailError"
	}
}
