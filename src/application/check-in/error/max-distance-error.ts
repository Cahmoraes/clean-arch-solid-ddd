export class MaxDistanceError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('Distance too far', errorOptions)
    this.name = 'MaxDistanceError'
  }
}
