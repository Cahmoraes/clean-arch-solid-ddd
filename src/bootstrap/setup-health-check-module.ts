import { TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Health-Check Module
 * Resolves and returns all health-check-related controllers
 */
export function setupHealthCheckModule(): ModuleControllers {
  const controllers = [resolve(TYPES.Controllers.HealthCheck)]
  return { controllers }
}
