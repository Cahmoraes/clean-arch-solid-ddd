import { AUTH_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup User Module
 * Resolves and returns all user-related controllers
 */

export function setupUserModule(): ModuleControllers {
  const controllers = [
    resolve(USER_TYPES.Controllers.CreateUser),
    resolve(USER_TYPES.Controllers.UserProfile),
    resolve(USER_TYPES.Controllers.MyProfile),
    resolve(USER_TYPES.Controllers.UserMetrics),
    resolve(AUTH_TYPES.Controllers.RefreshToken),
    resolve(USER_TYPES.Controllers.ChangePassword),
    resolve(USER_TYPES.Controllers.FetchUsers),
    resolve(USER_TYPES.Controllers.ActivateUser),
  ]
  return { controllers }
}
