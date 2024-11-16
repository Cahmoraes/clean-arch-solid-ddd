import { ContainerModule, type interfaces } from 'inversify'

import { AuthenticateUseCase } from '@/application/use-case/authenticate.usecase'
import { CreateUserUseCase } from '@/application/use-case/create-user.usecase'
import { UserProfileUseCase } from '@/application/use-case/user-profile.usecase'
import { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import { MyProfileController } from '@/infra/controllers/user/my-profile.controller'
import { UserProfileController } from '@/infra/controllers/user/user-profile.controller'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { PrismaUserRepository } from '@/infra/database/repository/prisma/prisma-user-repository'

import { TYPES } from '../../types'
import { UserRepositoryProvider } from './user-repository-provider'

export const userContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind<PrismaUserRepository>(PrismaUserRepository).toSelf()
  bind<InMemoryUserRepository>(InMemoryUserRepository).toSelf()
  bind(TYPES.Repositories.User).toDynamicValue(UserRepositoryProvider.provide)
  bind(TYPES.Controllers.CreateUser).to(CreateUserController)
  bind(TYPES.UseCases.CreateUser).to(CreateUserUseCase)
  bind(TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
  bind(TYPES.UseCases.UserProfile).to(UserProfileUseCase)
  bind(TYPES.Controllers.UserProfile).to(UserProfileController)
  bind(TYPES.Controllers.MyProfile).to(MyProfileController)
})
