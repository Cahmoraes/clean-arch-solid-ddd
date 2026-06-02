import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidUserTokenError extends DomainError {
	public readonly kind = "unauthorized" as const

	constructor() {
		super("Invalid user token")
		this.name = "InvalidUserTokenError"
	}
}
