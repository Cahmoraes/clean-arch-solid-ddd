import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidPlanNameError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Plan name is required", errorOptions)
		this.name = "InvalidPlanNameError"
	}
}
