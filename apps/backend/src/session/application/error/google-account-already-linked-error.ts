import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GoogleAccountAlreadyLinkedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("This email is already linked to a different Google account")
		this.name = "GoogleAccountAlreadyLinkedError"
	}
}
