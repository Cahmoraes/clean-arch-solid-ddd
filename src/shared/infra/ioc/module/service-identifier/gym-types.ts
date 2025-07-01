export const GYM_TYPES = {
  Repositories: {
    Gym: Symbol.for('GymRepository'),
  },
  PG: {
    Gym: Symbol.for('PgGymRepository'),
  },
  UseCases: {
    CreateGym: Symbol.for('CreateGymUseCase'),
    UpdateGym: Symbol.for('UpdateGymUseCase'),
    DeleteGym: Symbol.for('DeleteGymUseCase'),
    SearchGym: Symbol.for('SearchGymUseCase'),
    FetchNearbyGym: Symbol.for('FetchNearbyGymUseCase'),
  },
  Controllers: {
    CreateGym: Symbol.for('CreateGymController'),
    SearchGym: Symbol.for('SearchGymController'),
    FetchNearbyGym: Symbol.for('FetchNearbyGymController'),
  },
} as const
