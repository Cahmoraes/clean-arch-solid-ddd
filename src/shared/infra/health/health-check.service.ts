import { inject, injectable } from 'inversify'

import { TYPES } from '../ioc/types'
import type { CacheHealthProvider } from './cache/cache-health-provider'
import type { DatabaseHealthProvider } from './database/database-health-provider'
import type { HealthStatus, ServiceHealth } from './health-check.types'

@injectable()
export class HealthCheckService {
  constructor(
    @inject(TYPES.HealthCheck.Database)
    private readonly databaseProvider: DatabaseHealthProvider,
    @inject(TYPES.HealthCheck.Cache)
    private readonly cacheProvider: CacheHealthProvider,
  ) {}

  public async check(): Promise<HealthStatus> {
    const services = await Promise.all([
      this.databaseProvider.check(),
      this.cacheProvider.check(),
    ])
    return {
      status: this.determineOverallStatus(services),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        database: services[0],
        cache: services[1],
      },
    }
  }

  private determineOverallStatus(
    services: ServiceHealth[],
  ): 'healthy' | 'unhealthy' {
    return services.some((service) => service.status === 'down')
      ? 'unhealthy'
      : 'healthy'
  }
}
