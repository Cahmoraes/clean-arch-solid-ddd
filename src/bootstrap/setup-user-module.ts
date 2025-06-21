import { RefreshTokenController } from '@/session/infra/controller/refresh-token.controller'
import { ActivateUserController } from '@/user/infra/controller/activate-user.controller'
import { ChangePasswordController } from '@/user/infra/controller/change-password.controller'
import { CreateUserController } from '@/user/infra/controller/create-user.controller'
import { FetchUsersController } from '@/user/infra/controller/fetch-users.controller'
import { MyProfileController } from '@/user/infra/controller/my-profile.controller'
import { UserMetricsController } from '@/user/infra/controller/user-metrics.controller'
import { UserProfileController } from '@/user/infra/controller/user-profile.controller'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup User Module
 * Resolves and returns all user-related controllers
 */

export function setupUserModule(): ModuleControllers {
  const controllers = [
    resolve(CreateUserController),
    resolve(UserProfileController),
    resolve(MyProfileController),
    resolve(UserMetricsController),
    resolve(RefreshTokenController),
    resolve(ChangePasswordController),
    resolve(FetchUsersController),
    resolve(ActivateUserController),
  ]
  return { controllers }
}
