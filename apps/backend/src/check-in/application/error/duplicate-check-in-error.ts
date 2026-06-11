import { DomainError } from "@/shared/domain/error/domain-error.js"

export class DuplicateCheckInError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("User already has a check-in today")
		this.name = "DuplicateCheckInError"
	}
}
