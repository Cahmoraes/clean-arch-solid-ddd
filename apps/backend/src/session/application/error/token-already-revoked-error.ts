import { DomainError } from "@/shared/domain/error/domain-error.js"

export class TokenAlreadyRevokedError extends DomainError {
	readonly name = "TokenAlreadyRevokedError"
	public readonly kind = "unauthorized" as const

	constructor(sessionId?: string, cause?: ErrorOptions) {
		super(`Token with ID ${sessionId} has already been revoked`, cause)
	}
}
