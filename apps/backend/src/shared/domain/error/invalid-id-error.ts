import { DomainError } from "./domain-error.js"

export class InvalidIdError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Invalid ID: ID cannot be empty", errorOptions)
		this.name = "InvalidIdError"
	}
}
