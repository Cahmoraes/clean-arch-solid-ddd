import { inject, injectable } from 'inversify'

import type { RedisAdapter } from '../../database/redis/redis-adapter'
import { HEALTH_CHECK_TYPES, SHARED_TYPES } from '../../ioc/types'
import type { HealthProvider, ServiceHealth } from '../health-check'

@injectable()
export class CacheHealthProvider implements HealthProvider {
  readonly name = 'cache'

  constructor(
    @inject(SHARED_TYPES.Redis)
    private readonly redisClient: RedisAdapter,
  ) {}

  public async check(): Promise<ServiceHealth> {
    const startTime = Date.now()
    try {
      await this.redisClient.isHealth()
      return this.createServiceHealthResponse('up', startTime)
    } catch (error) {
      return this.createServiceHealthResponse('down', startTime, error)
    }
  }

  private createServiceHealthResponse(
    status: ServiceHealth['status'],
    startTime: number,
    error?: unknown,
  ): ServiceHealth {
    const response: ServiceHealth = {
      name: this.name,
      status,
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      metadata: {
        provider: 'redis',
        type: 'cache',
      },
    }
    if (error && status === 'down') {
      response.error =
        error instanceof Error ? error.message : 'Unknown cache error'
    }
    return response
  }
}
