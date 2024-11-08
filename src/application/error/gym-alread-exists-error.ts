export class GymAlreadyExistsError extends Error {
  constructor() {
    super('Gym already exists')
    this.name = 'GymAlreadyExistsError'
  }
}
