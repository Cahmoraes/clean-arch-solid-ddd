import { ContainerModule, type interfaces } from 'inversify'

import type { UserDAO } from '@/application/user/dao/user-dao'
import { AuthenticateUseCase } from '@/application/user/use-case/authenticate.usecase'
import { ChangePasswordUseCase } from '@/application/user/use-case/change-password.usecase'
import { CreateUserUseCase } from '@/application/user/use-case/create-user.usecase'
import { FetchUsersUseCase } from '@/application/user/use-case/fetch-users.usecase'
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
import { UserDAOMemory } from '@/infra/database/dao/user-dao-memory'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { PrismaUserRepository } from '@/infra/database/repository/prisma/prisma-user-repository'

import { TYPES } from '../../types'
import { UserRepositoryProvider } from './user-repository-provider'

export const userContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind<PrismaUserRepository>(PrismaUserRepository).toSelf()
  bind<InMemoryUserRepository>(InMemoryUserRepository).toSelf()
  bind(TYPES.Repositories.User)
    .toDynamicValue(UserRepositoryProvider.provide)
    .inSingletonScope()
  bind<UserDAO>(TYPES.DAO.User).to(UserDAOMemory).inSingletonScope()
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
})
