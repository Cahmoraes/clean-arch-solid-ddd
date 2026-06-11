import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymAlreadyExistsError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Gym already exists", errorOptions)
		this.name = "GymAlreadyExistsError"
	}
}
