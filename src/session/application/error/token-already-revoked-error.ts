export class TokenAlreadyRevokedError extends Error {
	readonly name = "TokenAlreadyRevokedError"

	constructor(sessionId?: string, cause?: ErrorOptions) {
		super(`Token with ID ${sessionId} has already been revoked`, cause)
	}
}
