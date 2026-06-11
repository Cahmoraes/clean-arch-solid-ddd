import { DomainError } from "@/shared/domain/error/domain-error.js"

export class PasswordNotSetError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Password not set for this account")
		this.name = "PasswordNotSetError"
	}
}
