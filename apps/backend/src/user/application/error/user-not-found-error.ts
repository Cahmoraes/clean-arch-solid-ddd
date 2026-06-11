import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(errorOptions?: ErrorOptions) {
		super("User not found", errorOptions)
		this.name = "UserNotFoundError"
	}
}
