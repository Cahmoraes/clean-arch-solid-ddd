export class InvalidLongitudeError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('Invalid longitude', errorOptions)
    this.name = 'InvalidLongitudeError'
  }
}
