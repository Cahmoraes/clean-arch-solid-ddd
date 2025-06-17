export class SessionNotFoundError extends Error {
  public readonly name = 'SessionNotFoundError'

  constructor(sessionId: string, cause?: ErrorOptions) {
    super(`Session with ID ${sessionId} not found.`, cause)
  }
}
