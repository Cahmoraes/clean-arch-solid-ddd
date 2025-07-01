export const TYPES = {
  Server: {
    Fastify: Symbol.for('FastifyServer'),
  },
  Prisma: {
    Client: Symbol.for('PrismaClient'),
    UnitOfWork: Symbol.for('PrismaUnitOfWork'),
  },
  Repositories: {
    User: Symbol.for('UserRepository'),
    Gym: Symbol.for('GymRepository'),
    CheckIn: Symbol.for('CheckInRepository'),
  },
  PG: {
    Client: Symbol.for('PgClient'),
    User: Symbol.for('PgUserRepository'),
    Gym: Symbol.for('PgGymRepository'),
    CheckIn: Symbol.for('PgCheckInRepository'),
  },
  Controllers: {
    CreateUser: Symbol.for('UserController'),
    Authenticate: Symbol.for('AuthenticateController'),
    Logout: Symbol.for('LogoutController'),
    UserProfile: Symbol.for('UserProfileController'),
    CheckIn: Symbol.for('CheckInController'),
    CreateGym: Symbol.for('CreateGymController'),
    UserMetrics: Symbol.for('UserMetricsController'),
    SearchGym: Symbol.for('SearchGymController'),
    ValidateCheckIn: Symbol.for('ValidateCheckInController'),
    MyProfile: Symbol.for('MyProfileController'),
    RefreshToken: Symbol.for('RefreshTokenController'),
    Queue: Symbol.for('QueueController'),
    ChangePassword: Symbol.for('ChangePasswordController'),
    FetchUsers: Symbol.for('FetchUsersController'),
    UpdateUserProfile: Symbol.for('UpdateUserProfileController'),
    ActivateUser: Symbol.for('ActivateUserController'),
    HealthCheck: Symbol.for('HealthCheckController'),
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
    ChangePassword: Symbol.for('ChangePasswordUseCase'),
    FetchUsers: Symbol.for('FetchUsersUseCase'),
    UpdateUserProfile: Symbol.for('UpdateUserProfileUseCase'),
    SuspendUser: Symbol.for('SuspendUserUseCase'),
    ActivateUser: Symbol.for('ActivateUserUseCase'),
    Logout: Symbol.for('LogoutUseCase'),
  },
  Tokens: {
    Auth: Symbol.for('AuthToken'),
  },
  Cookies: {
    Manager: Symbol.for('CookieManager'),
  },
  Factories: {
    PreHandlerAuthenticate: Symbol.for('PreHandlerAuthenticate'),
  },
  DAO: {
    User: Symbol.for('UserDAO'),
    Session: Symbol.for('SessionDAO'),
  },
  HealthCheck: {
    Service: Symbol.for('HealthCheckService'),
    Database: Symbol.for('DatabaseHealthProvider'),
    Cache: Symbol.for('CacheHealthProvider'),
  },
  Logger: Symbol.for('Logger'),
  Queue: Symbol.for('Queue'),
  Mailer: Symbol.for('Mailer'),
  Redis: Symbol.for('Redis'),
  UnitOfWork: Symbol.for('UnitOfWork'),
  CronJob: Symbol.for('CronJob'),
  Task: {
    UpdateUserProfileCache: Symbol.for('UpdateUserProfileCacheTask'),
  },
} as const

export const USER_TYPES = {
  Repositories: {
    User: Symbol.for('UserRepository'),
  },
  PG: {
    User: Symbol.for('PgUserRepository'),
  },
  UseCases: {
    CreateUser: Symbol.for('CreateUserUseCase'),
    UpdateUser: Symbol.for('UpdateUserUseCase'),
    DeleteUser: Symbol.for('DeleteUserUseCase'),
    FetchUsers: Symbol.for('FetchUsersUseCase'),
    UserProfile: Symbol.for('UserProfileUseCase'),
    ChangePassword: Symbol.for('ChangePasswordUseCase'),
    ActivateUser: Symbol.for('ActivateUserUseCase'),
    UpdateUserProfile: Symbol.for('UpdateUserProfileUseCase'),
    SuspendUser: Symbol.for('SuspendUserUseCase'),
    UserMetrics: Symbol.for('UserMetricsUseCase'),
  },
  Controllers: {
    CreateUser: Symbol.for('UserController'),
    UserProfile: Symbol.for('UserProfileController'),
    ChangePassword: Symbol.for('ChangePasswordController'),
    FetchUsers: Symbol.for('FetchUsersController'),
    UpdateUserProfile: Symbol.for('UpdateUserProfileController'),
    ActivateUser: Symbol.for('ActivateUserController'),
    MyProfile: Symbol.for('MyProfileController'),
    UserMetrics: Symbol.for('UserMetricsController'),
  },
  DAO: {
    User: Symbol.for('UserDAO'),
  },
  Task: {
    UpdateUserProfileCache: Symbol.for('UpdateUserProfileCacheTask'),
  },
} as const

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

export const CHECKIN_TYPES = {
  Repositories: {
    CheckIn: Symbol.for('CheckInRepository'),
  },
  PG: {
    CheckIn: Symbol.for('PgCheckInRepository'),
  },
  UseCases: {
    CreateCheckIn: Symbol.for('CreateCheckInUseCase'),
    ValidateCheckIn: Symbol.for('ValidateCheckInUseCase'),
    FetchCheckIns: Symbol.for('FetchCheckInsUseCase'),
    CheckIn: Symbol.for('CheckInUseCase'),
    CheckInHistory: Symbol.for('CheckInHistoryUseCase'),
  },
  Controllers: {
    CheckIn: Symbol.for('CheckInController'),
    ValidateCheckIn: Symbol.for('ValidateCheckInController'),
  },
} as const

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
  Tokens: {
    Auth: Symbol.for('AuthToken'),
  },
  Cookies: {
    Manager: Symbol.for('CookieManager'),
  },
  Factories: {
    PreHandlerAuthenticate: Symbol.for('PreHandlerAuthenticate'),
  },
  DAO: {
    Session: Symbol.for('SessionDAO'),
  },
} as const

export const HEALTH_CHECK_TYPES = {
  UseCases: {
    HealthCheck: Symbol.for('HealthCheckUseCase'),
  },
  Controllers: {
    HealthCheck: Symbol.for('HealthCheckController'),
  },
  Service: Symbol.for('HealthCheckService'),
  Providers: {
    Database: Symbol.for('DatabaseHealthProvider'),
    Cache: Symbol.for('CacheHealthProvider'),
  },
} as const

export const SHARED_TYPES = {
  Controllers: {
    Queue: Symbol.for('QueueController'),
  },
  Task: {
    UpdateUserProfileCache: Symbol.for('UpdateUserProfileCacheTask'),
  },
  Logger: Symbol.for('Logger'),
  Queue: Symbol.for('Queue'),
  Mailer: Symbol.for('Mailer'),
  Redis: Symbol.for('Redis'),
  UnitOfWork: Symbol.for('UnitOfWork'),
  CronJob: Symbol.for('CronJob'),
} as const
