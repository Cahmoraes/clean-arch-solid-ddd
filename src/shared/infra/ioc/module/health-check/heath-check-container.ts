import { ContainerModule } from 'inversify'

import { DatabaseHealthProvider } from '@/shared/infra/health/database-health-provider'

import { TYPES } from '../../types'

export const healthCheckContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.HealthCheck.Database).to(DatabaseHealthProvider)
})
