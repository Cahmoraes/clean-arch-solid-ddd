import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidResetTokenError extends DomainError {
	public readonly kind = "unauthorized" as const

	constructor() {
		super("Invalid or expired password reset token")
		this.name = "InvalidResetTokenError"
	}
}
