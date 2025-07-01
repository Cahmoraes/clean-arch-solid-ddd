import { GYM_TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Gym Module
 * Resolves and returns all gym-related controllers
 */
export function setupGymModule(): ModuleControllers {
  const controllers = [
    resolve(GYM_TYPES.Controllers.CreateGym),
    resolve(GYM_TYPES.Controllers.SearchGym),
  ]
  return { controllers }
}
