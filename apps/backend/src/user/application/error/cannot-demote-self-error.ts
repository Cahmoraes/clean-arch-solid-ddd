import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CannotDemoteSelfError extends DomainError {
	public readonly kind = "forbidden" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Admin cannot remove their own admin privileges", errorOptions)
		this.name = "CannotDemoteSelfError"
	}
}
