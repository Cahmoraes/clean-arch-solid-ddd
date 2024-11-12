export class InvalidEmailError extends Error {
  constructor() {
    super('Invalid email format')
    this.name = 'InvalidEmailError'
  }
}
