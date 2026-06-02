import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Gym not found", errorOptions)
		this.name = "GymNotFoundError"
	}
}
