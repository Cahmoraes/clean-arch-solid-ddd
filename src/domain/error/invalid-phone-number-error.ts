export class InvalidPhoneNumberError extends Error {
  constructor() {
    super('Invalid phone number')
    this.name = 'InvalidPhoneNumberError'
  }
}
