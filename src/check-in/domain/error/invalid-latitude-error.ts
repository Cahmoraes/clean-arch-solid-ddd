export class InvalidLatitudeError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('Invalid latitude', errorOptions)
    this.name = 'InvalidLatitudeError'
  }
}
