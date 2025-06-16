import { AuthenticateController } from '@/user/infra/controller/authenticate.controller'
import { ChangePasswordController } from '@/user/infra/controller/change-password.controller'
import { CreateUserController } from '@/user/infra/controller/create-user.controller'
import { FetchUsersController } from '@/user/infra/controller/fetch-users.controller'
import { MyProfileController } from '@/user/infra/controller/my-profile.controller'
import { RefreshTokenController } from '@/user/infra/controller/refresh-token.controller'
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
    resolve(AuthenticateController),
    resolve(UserProfileController),
    resolve(MyProfileController),
    resolve(UserMetricsController),
    resolve(RefreshTokenController),
    resolve(ChangePasswordController),
    resolve(FetchUsersController),
  ]
  return { controllers }
}
