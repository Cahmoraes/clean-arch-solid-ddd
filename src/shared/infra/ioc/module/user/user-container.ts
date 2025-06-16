import { ContainerModule } from 'inversify'

import { PgUserRepository } from '@/shared/infra/database/repository/pg/pg-user-repository'
import { ActiveUserUseCase } from '@/user/application/use-case/active-user.usecase'
import { AuthenticateUseCase } from '@/user/application/use-case/authenticate.usecase'
import { ChangePasswordUseCase } from '@/user/application/use-case/change-password.usecase'
import { CreateUserUseCase } from '@/user/application/use-case/create-user.usecase'
import { FetchUsersUseCase } from '@/user/application/use-case/fetch-users.usecase'
import { SuspendUserUseCase } from '@/user/application/use-case/suspend-user.usecase'
import { UserMetricsUseCase } from '@/user/application/use-case/user-metrics.usecase'
import { UserProfileUseCase } from '@/user/application/use-case/user-profile.usecase'
import { ActivateUserController } from '@/user/infra/controller/activate-user.controller'
import { AuthenticateController } from '@/user/infra/controller/authenticate.controller'
import { ChangePasswordController } from '@/user/infra/controller/change-password.controller'
import { CreateUserController } from '@/user/infra/controller/create-user.controller'
import { FetchUsersController } from '@/user/infra/controller/fetch-users.controller'
import { MyProfileController } from '@/user/infra/controller/my-profile.controller'
import { RefreshTokenController } from '@/user/infra/controller/refresh-token.controller'
import { UserMetricsController } from '@/user/infra/controller/user-metrics.controller'
import { UserProfileController } from '@/user/infra/controller/user-profile.controller'

import { TYPES } from '../../types'
import { UserDAOProvider } from './user-dao-provider'
import { UserRepositoryProvider } from './user-repository-provider'

export const userContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Repositories.User)
    .toDynamicValue(UserRepositoryProvider.provide)
    .inSingletonScope()
  bind(TYPES.PG.User).to(PgUserRepository).inRequestScope()
  bind(TYPES.DAO.User)
    .toDynamicValue(UserDAOProvider.provide)
    .inSingletonScope()
  bind(TYPES.Controllers.CreateUser).to(CreateUserController)
  bind(TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(TYPES.Controllers.UserProfile).to(UserProfileController)
  bind(TYPES.Controllers.MyProfile).to(MyProfileController)
  bind(TYPES.Controllers.UserMetrics).to(UserMetricsController)
  bind(TYPES.Controllers.RefreshToken).to(RefreshTokenController)
  bind(TYPES.Controllers.ChangePassword).to(ChangePasswordController)
  bind(TYPES.Controllers.FetchUsers).to(FetchUsersController)
  bind(TYPES.Controllers.UpdateUserProfile).to(UserProfileController)
  bind(TYPES.UseCases.CreateUser).to(CreateUserUseCase)
  bind(TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
  bind(TYPES.UseCases.UserProfile).to(UserProfileUseCase)
  bind(TYPES.UseCases.UserMetrics).to(UserMetricsUseCase)
  bind(TYPES.UseCases.ChangePassword).to(ChangePasswordUseCase)
  bind(TYPES.UseCases.FetchUsers).to(FetchUsersUseCase)
  bind(TYPES.UseCases.UpdateUserProfile).to(UserProfileUseCase)
  bind(TYPES.UseCases.SuspendUser).to(SuspendUserUseCase)
  bind(TYPES.UseCases.ActiveUser).to(ActiveUserUseCase)
  bind(TYPES.Controllers.ActivateUser).to(ActivateUserController)
})
