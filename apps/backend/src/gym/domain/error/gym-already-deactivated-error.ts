import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymAlreadyDeactivatedError extends DomainError {
	public readonly name = "GymAlreadyDeactivatedError"
	public readonly kind = "conflict" as const

	constructor(
		message: string = "Gym is already deactivated",
		cause?: ErrorOptions,
	) {
		super(message, cause)
	}
}
