import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymAlreadyActivatedError extends DomainError {
	public readonly name = "GymAlreadyActivatedError"
	public readonly kind = "conflict" as const

	constructor(
		message: string = "Gym is already activated",
		cause?: ErrorOptions,
	) {
		super(message, cause)
	}
}
