export class InvalidLongitudeError extends Error {
  constructor() {
    super('Invalid longitude')
    this.name = 'InvalidLongitudeError'
  }
}
