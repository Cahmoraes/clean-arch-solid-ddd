export class CheckInNotFoundError extends Error {
  constructor() {
    super('Check-in not found')
    this.name = 'CheckInNotFoundError'
  }
}
