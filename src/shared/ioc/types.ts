export const TYPES = {
  Prisma: {
    Client: Symbol.for('PrismaClient'),
  },
  Repositories: {
    User: Symbol.for('UserRepository'),
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
  },
  Tokens: {
    Auth: Symbol.for('AuthToken'),
  },
}
