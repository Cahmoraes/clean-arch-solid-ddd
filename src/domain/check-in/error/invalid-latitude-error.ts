export class InvalidLatitudeError extends Error {
  constructor() {
    super('Invalid latitude')
    this.name = 'InvalidLatitudeError'
  }
}
