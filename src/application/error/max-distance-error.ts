export class MaxDistanceError extends Error {
  constructor() {
    super('Distance too far')
    this.name = 'MaxDistanceError'
  }
}
