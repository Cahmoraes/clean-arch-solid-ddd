import { CHECKIN_TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Check-in Module
 * Resolves and returns all check-in-related controllers
 */
export function setupCheckInModule(): ModuleControllers {
  const controllers = [
    resolve(CHECKIN_TYPES.Controllers.CheckIn),
    resolve(CHECKIN_TYPES.Controllers.ValidateCheckIn),
  ]
  return { controllers }
}
