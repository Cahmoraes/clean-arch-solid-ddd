export class InvalidNameLengthError extends Error {
  constructor() {
    super('Name must have between 10 and 30 characters')
    this.name = 'InvalidNameLengthError'
  }
}
