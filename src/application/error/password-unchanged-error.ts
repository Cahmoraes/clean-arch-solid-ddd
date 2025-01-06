export class PasswordUnchangedError extends Error {
  constructor() {
    super('The new password must be different from the old password.')
    this.name = 'PasswordUnchangedError'
  }
}
