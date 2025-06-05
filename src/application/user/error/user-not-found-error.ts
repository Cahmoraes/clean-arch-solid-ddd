export class UserNotFoundError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('User not found', errorOptions)
    this.name = 'UserNotFoundError'
  }
}
