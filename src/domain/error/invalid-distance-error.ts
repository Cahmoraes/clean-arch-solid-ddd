export class InvalidDistanceError extends Error {
  constructor(message: string) {
    super(`Invalid distance: ${message}`)
    this.name = 'InvalidDistanceError'
  }
}
