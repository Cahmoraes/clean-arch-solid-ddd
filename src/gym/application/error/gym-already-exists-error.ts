export class GymAlreadyExistsError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('Gym already exists', errorOptions)
    this.name = 'GymAlreadyExistsError'
  }
}
