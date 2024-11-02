import { ContainerModule, type interfaces } from 'inversify'

import type { GymRepository } from '@/application/repository/gym-repository'
import { CreateGymUseCase } from '@/application/use-case/create-gym.usecase'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory-gym-repository'

import { TYPES } from '../../types'

export const gymContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind<GymRepository>(TYPES.Repositories.Gym).to(InMemoryGymRepository)
  bind(TYPES.UseCases.CreateGym).to(CreateGymUseCase)
})
