import { DomainError } from "@/shared/domain/error/domain-error.js"

export class MaxDistanceError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Distance too far", errorOptions)
		this.name = "MaxDistanceError"
	}
}
