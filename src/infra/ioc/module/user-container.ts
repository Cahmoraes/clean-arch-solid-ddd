import { ContainerModule, type interfaces } from 'inversify'

import { CreateUserUseCase } from '@/application/use-case/create-user.usecase'
import { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import { prismaClient } from '@/infra/database/connection/prisma-client'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
import { PrismaUserRepository } from '@/infra/database/repository/prisma-user-repository'

import { TYPES } from '../types'
import { UserRepositoryProvider } from './user-repository-provider'

export const userContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.PrismaClient).toConstantValue(prismaClient)
  bind<PrismaUserRepository>(PrismaUserRepository).toSelf()
  bind<InMemoryUserRepository>(InMemoryUserRepository).toSelf()
  bind(TYPES.UserRepository).toDynamicValue(UserRepositoryProvider.provide)
  bind(TYPES.CreateUserController).to(CreateUserController)
  bind(TYPES.CreateUserUseCase).to(CreateUserUseCase)
})
