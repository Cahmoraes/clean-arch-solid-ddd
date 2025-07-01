import { ContainerModule } from 'inversify'

import { HealthCheckController } from '@/shared/infra/controller/health-check-controller'
import { CacheHealthProvider } from '@/shared/infra/health/cache/cache-health-provider'
import { DatabaseHealthProvider } from '@/shared/infra/health/database/database-health-provider'
import { HealthCheckImpl } from '@/shared/infra/health/health-check.impl'

import { HEALTH_CHECK_TYPES } from '../../types'

export const healthCheckContainer = new ContainerModule(({ bind }) => {
  bind(HEALTH_CHECK_TYPES.Providers.Database).to(DatabaseHealthProvider)
  bind(HEALTH_CHECK_TYPES.Providers.Cache).to(CacheHealthProvider)
  bind(HEALTH_CHECK_TYPES.Controllers.HealthCheck).to(HealthCheckController)
  bind(HEALTH_CHECK_TYPES.Service).to(HealthCheckImpl)
})
