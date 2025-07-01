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
