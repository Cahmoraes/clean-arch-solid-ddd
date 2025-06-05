export class UserAlreadyExistsError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('User already exists', errorOptions)
    this.name = 'UserAlreadyExistsError'
  }
}
