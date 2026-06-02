import { DomainError } from "@/shared/domain/error/domain-error.js"

export class PasswordAlreadySetError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Password already set for this account")
		this.name = "PasswordAlreadySetError"
	}
}
