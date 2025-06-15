import { CheckInController } from '@/check-in/infra/controller/check-in.controller'
import { ValidateCheckInController } from '@/check-in/infra/controller/validate-check-in.controller'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Check-in Module
 * Resolves and returns all check-in-related controllers
 */
export function setupCheckInModule(): ModuleControllers {
  const controllers = [
    resolve(CheckInController),
    resolve(ValidateCheckInController),
  ]
  return { controllers }
}
