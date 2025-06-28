import { TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup User Module
 * Resolves and returns all user-related controllers
 */

export function setupUserModule(): ModuleControllers {
  const controllers = [
    resolve(TYPES.Controllers.CreateUser),
    resolve(TYPES.Controllers.UserProfile),
    resolve(TYPES.Controllers.MyProfile),
    resolve(TYPES.Controllers.UserMetrics),
    resolve(TYPES.Controllers.RefreshToken),
    resolve(TYPES.Controllers.ChangePassword),
    resolve(TYPES.Controllers.FetchUsers),
    resolve(TYPES.Controllers.ActivateUser),
  ]
  return { controllers }
}
