import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidCredentialsError extends DomainError {
	public readonly kind = "unauthorized" as const

	constructor() {
		super("Invalid Credentials")
		this.name = "InvalidCredentialsError"
	}
}
