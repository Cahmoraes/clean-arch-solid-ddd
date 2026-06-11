import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CheckInAlreadyRejectedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Check-in already rejected")
		this.name = "CheckInAlreadyRejectedError"
	}
}
