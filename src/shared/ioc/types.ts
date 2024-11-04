export const TYPES = {
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
  },
  UseCases: {
    CreateUser: Symbol.for('CreateUserUserCase'),
    Authenticate: Symbol.for('AuthenticateUseCase'),
    UserProfile: Symbol.for('UserProfileUseCase'),
    CreateGym: Symbol.for('CreateGymUseCase'),
    CreateCheckIn: Symbol.for('CheckInUseCase'),
  },
  Tokens: {
    Auth: Symbol.for('AuthToken'),
  },
}
