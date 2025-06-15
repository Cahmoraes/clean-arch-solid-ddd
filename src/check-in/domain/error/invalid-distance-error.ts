export class InvalidDistanceError extends Error {
  constructor(message: string, errorOptions?: ErrorOptions) {
    super(`Invalid distance: ${message}`, errorOptions)
    this.name = 'InvalidDistanceError'
  }
}
