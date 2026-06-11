import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CheckInTimeExceededError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Check-in time exceeded")
		this.name = "CheckInTimeExceededError"
	}
}
