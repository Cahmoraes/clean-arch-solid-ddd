import { HealthCheckController } from '@/shared/infra/controller/health-check-controller'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Health-Check Module
 * Resolves and returns all health-check-related controllers
 */
export function setupHealthCheckModule(): ModuleControllers {
  const controllers = [resolve(HealthCheckController)]
  return { controllers }
}
