export class InvalidIdError extends Error {
  constructor() {
    super('Invalid ID: ID cannot be empty')
    this.name = 'InvalidIdError'
  }
}
