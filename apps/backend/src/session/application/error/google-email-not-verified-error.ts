import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GoogleEmailNotVerifiedError extends DomainError {
	public readonly kind = "validation" as const

	constructor() {
		super("Google email is not verified")
		this.name = "GoogleEmailNotVerifiedError"
	}
}
