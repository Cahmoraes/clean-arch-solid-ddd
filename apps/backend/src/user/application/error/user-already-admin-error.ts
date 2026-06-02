import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserAlreadyAdminError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("User is already an admin", errorOptions)
		this.name = "UserAlreadyAdminError"
	}
}
