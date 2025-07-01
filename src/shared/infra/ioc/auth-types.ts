export const AUTH_TYPES = {
  UseCases: {
    Authenticate: Symbol.for('AuthenticateUseCase'),
    Logout: Symbol.for('LogoutUseCase'),
    RefreshToken: Symbol.for('RefreshTokenUseCase'),
  },
  Controllers: {
    Authenticate: Symbol.for('AuthenticateController'),
    Logout: Symbol.for('LogoutController'),
    RefreshToken: Symbol.for('RefreshTokenController'),
  },
  DAO: {
    Session: Symbol.for('SessionDAO'),
  },
} as const
