export class InvalidIdError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('Invalid ID: ID cannot be empty', errorOptions)
    this.name = 'InvalidIdError'
  }
}
