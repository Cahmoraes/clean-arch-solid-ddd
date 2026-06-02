import { DomainError } from "@/shared/domain/error/domain-error.js"

export class ReauthGrantInvalidError extends DomainError {
	public readonly kind = "unauthorized" as const

	constructor() {
		super("Reauth grant is invalid or expired")
		this.name = "ReauthGrantInvalidError"
	}
}
