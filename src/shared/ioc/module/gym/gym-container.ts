import { ContainerModule, type interfaces } from 'inversify'

import type { GymRepository } from '@/application/repository/gym-repository'
import { CreateGymUseCase } from '@/application/use-case/create-gym.usecase'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { PrismaGymRepository } from '@/infra/database/repository/prisma/prisma-gym-repository'

import { TYPES } from '../../types'
import { GymRepositoryProvider } from './gym-repository-provider'

export const gymContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind<GymRepository>(PrismaGymRepository).toSelf()
  bind<GymRepository>(InMemoryGymRepository).toSelf()
  bind<GymRepository>(TYPES.Repositories.Gym).toDynamicValue(
    GymRepositoryProvider.provide,
  )
  bind(TYPES.UseCases.CreateGym).to(CreateGymUseCase)
})
