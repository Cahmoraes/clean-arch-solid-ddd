export const TYPES = {
  Prisma: {
    Client: Symbol.for('PrismaClient'),
  },
  Repositories: {
    User: Symbol.for('UserRepository'),
  },
  Controllers: {
    User: Symbol.for('UserController'),
    Authenticate: Symbol.for('AuthenticateController'),
  },
  UseCases: {
    CreateUser: Symbol.for('CreateUserUserCase'),
    Authenticate: Symbol.for('AuthenticateUseCase'),
  },
  Tokens: {
    Auth: Symbol.for('AuthToken'),
  },
}
