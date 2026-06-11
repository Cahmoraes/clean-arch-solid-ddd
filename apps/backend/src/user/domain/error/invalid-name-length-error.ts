import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidNameLengthError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Name must have between 10 and 30 characters", errorOptions)
		this.name = "InvalidNameLengthError"
	}
}
