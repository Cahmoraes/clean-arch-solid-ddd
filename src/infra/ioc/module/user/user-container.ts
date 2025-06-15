import { ContainerModule } from 'inversify'

import { ActiveUserUseCase } from '@/application/user/use-case/active-user.usecase'
import { AuthenticateUseCase } from '@/application/user/use-case/authenticate.usecase'
import { ChangePasswordUseCase } from '@/application/user/use-case/change-password.usecase'
import { CreateUserUseCase } from '@/application/user/use-case/create-user.usecase'
import { FetchUsersUseCase } from '@/application/user/use-case/fetch-users.usecase'
import { SuspendUserUseCase } from '@/application/user/use-case/suspend-user.usecase'
import { UserMetricsUseCase } from '@/application/user/use-case/user-metrics.usecase'
import { UserProfileUseCase } from '@/application/user/use-case/user-profile.usecase'
import { AuthenticateController } from '@/infra/controller/user/authenticate.controller'
import { ChangePasswordController } from '@/infra/controller/user/change-password.controller'
import { CreateUserController } from '@/infra/controller/user/create-user.controller'
import { FetchUsersController } from '@/infra/controller/user/fetch-users.controller'
import { MyProfileController } from '@/infra/controller/user/my-profile.controller'
import { RefreshTokenController } from '@/infra/controller/user/refresh-token.controller'
import { UserMetricsController } from '@/infra/controller/user/user-metrics.controller'
import { UserProfileController } from '@/infra/controller/user/user-profile.controller'
import { PgUserRepository } from '@/infra/database/repository/pg/pg-user-repository'

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
})
