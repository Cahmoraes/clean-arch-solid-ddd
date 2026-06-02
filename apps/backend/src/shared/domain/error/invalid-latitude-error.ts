import { DomainError } from "./domain-error.js"

export class InvalidLatitudeError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Invalid latitude", errorOptions)
		this.name = "InvalidLatitudeError"
	}
}
