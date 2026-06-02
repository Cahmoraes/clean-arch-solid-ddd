import { DomainError } from "@/shared/domain/error/domain-error.js"

export class PasswordUnchangedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("The new password must be different from the old password.")
		this.name = "PasswordUnchangedError"
	}
}
