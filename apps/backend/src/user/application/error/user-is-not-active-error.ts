import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserIsNotActiveError extends DomainError {
	public readonly kind = "forbidden" as const

	constructor(errorOptions?: ErrorOptions) {
		super("User account is not active", errorOptions)
		this.name = "UserIsNotActiveError"
	}
}
