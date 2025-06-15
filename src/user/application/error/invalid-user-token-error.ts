export class InvalidUserTokenError extends Error {
  constructor() {
    super('Invalid user token')
    this.name = 'InvalidUserTokenError'
  }
}
