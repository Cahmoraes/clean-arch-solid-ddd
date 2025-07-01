export const SHARED_TYPES = {
  Controllers: {
    Queue: Symbol.for('QueueController'),
  },
  Task: {
    UpdateUserProfileCache: Symbol.for('UpdateUserProfileCacheTask'),
  },
  Server: {
    Fastify: Symbol.for('FastifyServer'),
  },
  Prisma: {
    Client: Symbol.for('PrismaClient'),
    UnitOfWork: Symbol.for('PrismaUnitOfWork'),
  },
  PG: {
    Client: Symbol.for('PgClient'),
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
  Logger: Symbol.for('Logger'),
  Queue: Symbol.for('Queue'),
  Mailer: Symbol.for('Mailer'),
  Redis: Symbol.for('Redis'),
  UnitOfWork: Symbol.for('UnitOfWork'),
  CronJob: Symbol.for('CronJob'),
} as const
