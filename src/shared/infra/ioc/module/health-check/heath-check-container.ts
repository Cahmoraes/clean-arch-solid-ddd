import { ContainerModule } from 'inversify'

import { HealthCheckController } from '@/shared/infra/controller/health-check-controller'
import { CacheHealthProvider } from '@/shared/infra/health/cache/cache-health-provider'
import { DatabaseHealthProvider } from '@/shared/infra/health/database/database-health-provider'
import { HealthCheckService } from '@/shared/infra/health/health-check.service'

import { TYPES } from '../../types'

export const healthCheckContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.HealthCheck.Database).to(DatabaseHealthProvider)
  bind(TYPES.HealthCheck.Cache).to(CacheHealthProvider)
  bind(TYPES.Controllers.HealthCheck).to(HealthCheckController)
  bind(TYPES.HealthCheck.Service).to(HealthCheckService)
})
