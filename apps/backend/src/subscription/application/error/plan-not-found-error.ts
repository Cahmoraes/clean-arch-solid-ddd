import { DomainError } from "@/shared/domain/error/domain-error.js"

export class PlanNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Plan not found", errorOptions)
		this.name = "PlanNotFoundError"
	}
}
