import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidDistanceError extends DomainError {
	public readonly kind = "validation" as const

	constructor(message: string, errorOptions?: ErrorOptions) {
		super(`Invalid distance: ${message}`, errorOptions)
		this.name = "InvalidDistanceError"
	}
}
