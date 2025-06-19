export class InvalidCNPJError extends Error {
  public readonly name = 'InvalidCNPJError'

  constructor(message: string, cause?: ErrorOptions) {
    super(`${message}`, cause)
  }
}
