import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserMissingAuthenticationMethodError extends DomainError {
	public readonly kind = "validation" as const

	constructor() {
		super(
			"User must have at least one authentication method: password or googleId",
		)
		this.name = "UserMissingAuthenticationMethodError"
	}
}
