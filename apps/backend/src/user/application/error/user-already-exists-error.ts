import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserAlreadyExistsError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("User already exists", errorOptions)
		this.name = "UserAlreadyExistsError"
	}
}
