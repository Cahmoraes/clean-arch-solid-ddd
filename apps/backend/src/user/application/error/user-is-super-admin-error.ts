import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserIsSuperAdminError extends DomainError {
	public readonly kind = "forbidden" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Cannot modify the super admin account", errorOptions)
		this.name = "UserIsSuperAdminError"
	}
}
