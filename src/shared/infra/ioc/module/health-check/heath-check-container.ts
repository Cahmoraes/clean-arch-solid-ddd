import { ContainerModule } from 'inversify'

import { CacheHealthProvider } from '@/shared/infra/health/cache/cache-health-provider'
import { DatabaseHealthProvider } from '@/shared/infra/health/database/database-health-provider'

import { TYPES } from '../../types'

export const healthCheckContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.HealthCheck.Database).to(DatabaseHealthProvider)
  bind(TYPES.HealthCheck.Cache).to(CacheHealthProvider)
})
