export class SessionRevokedError extends Error {
  readonly name = 'SessionRevokedError'

  constructor(sessionId?: string, cause?: ErrorOptions) {
    super(`Session with ID ${sessionId} has been revoked`, cause)
  }
}
