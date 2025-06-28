import { TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Gym Module
 * Resolves and returns all gym-related controllers
 */
export function setupGymModule(): ModuleControllers {
  const controllers = [
    resolve(TYPES.Controllers.CreateGym),
    resolve(TYPES.Controllers.SearchGym),
  ]
  return { controllers }
}
