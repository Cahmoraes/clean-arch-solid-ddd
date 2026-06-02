import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidGoogleTokenError extends DomainError {
	public readonly kind = "unauthorized" as const

	constructor() {
		super("Invalid or expired Google token")
		this.name = "InvalidGoogleTokenError"
	}
}
