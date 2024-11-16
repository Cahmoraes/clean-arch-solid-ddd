export const TYPES = {
  Server: {
    Fastify: Symbol.for('FastifyServer'),
  },
  Prisma: {
    Client: Symbol.for('PrismaClient'),
  },
  Repositories: {
    User: Symbol.for('UserRepository'),
    Gym: Symbol.for('GymRepository'),
    CheckIn: Symbol.for('CheckInRepository'),
  },
  Controllers: {
    CreateUser: Symbol.for('UserController'),
    Authenticate: Symbol.for('AuthenticateController'),
    UserProfile: Symbol.for('UserProfileController'),
    CheckIn: Symbol.for('CheckInController'),
    CreateGym: Symbol.for('CreateGymController'),
    UserMetrics: Symbol.for('UserMetricsController'),
    SearchGym: Symbol.for('SearchGymController'),
    ValidateCheckIn: Symbol.for('ValidateCheckInController'),
    MyProfile: Symbol.for('MyProfileController'),
  },
  UseCases: {
    CreateUser: Symbol.for('CreateUserUserCase'),
    Authenticate: Symbol.for('AuthenticateUseCase'),
    UserProfile: Symbol.for('UserProfileUseCase'),
    CreateGym: Symbol.for('CreateGymUseCase'),
    CheckIn: Symbol.for('CheckInUseCase'),
    CheckInHistory: Symbol.for('CheckInHistoryUseCase'),
    UserMetrics: Symbol.for('UserMetricsUseCase'),
    SearchGym: Symbol.for('SearchGymUseCase'),
    FetchNearbyGym: Symbol.for('FetchNearbyGymUseCase'),
    ValidateCheckIn: Symbol.for('ValidateCheckInUseCase'),
    Metrics: Symbol.for('MetricsUseCase'),
  },
  Tokens: {
    Auth: Symbol.for('AuthToken'),
  },
  Factories: {
    PreHandlerAuthenticate: Symbol.for('PreHandlerAuthenticate'),
  },
}
