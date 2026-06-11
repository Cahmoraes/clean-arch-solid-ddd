import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CannotDeleteSelfError extends DomainError {
	public readonly kind = "forbidden" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Admin cannot delete their own account", errorOptions)
		this.name = "CannotDeleteSelfError"
	}
}
