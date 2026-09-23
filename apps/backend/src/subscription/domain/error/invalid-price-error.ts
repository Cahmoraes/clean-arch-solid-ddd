import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidPriceError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Plan price cannot be negative", errorOptions)
		this.name = "InvalidPriceError"
	}
}
