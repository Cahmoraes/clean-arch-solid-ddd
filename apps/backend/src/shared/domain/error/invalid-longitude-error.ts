import { DomainError } from "./domain-error.js"

export class InvalidLongitudeError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Invalid longitude", errorOptions)
		this.name = "InvalidLongitudeError"
	}
}
