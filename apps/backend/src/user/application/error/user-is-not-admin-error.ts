import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserIsNotAdminError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("User is not an admin", errorOptions)
		this.name = "UserIsNotAdminError"
	}
}
