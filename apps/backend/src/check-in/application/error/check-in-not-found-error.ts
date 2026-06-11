import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CheckInNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor() {
		super("Check-in not found")
		this.name = "CheckInNotFoundError"
	}
}
