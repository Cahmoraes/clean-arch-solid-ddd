import { ContainerModule } from 'inversify'

import type { GymRepository } from '@/gym/application/repository/gym-repository'
import { CreateGymUseCase } from '@/gym/application/use-case/create-gym.usecase'
import { FetchNearbyGym } from '@/gym/application/use-case/fetch-nearby-gym.usecase'
import { SearchGymUseCase } from '@/gym/application/use-case/search-gym.usecase'
import { CreateGymController } from '@/gym/infra/controller/create-gym.controller'
import { SearchGymController } from '@/gym/infra/controller/search-gym.controller'

import { TYPES } from '../../types'
import { GymRepositoryProvider } from './gym-repository-provider'

export const gymContainer = new ContainerModule(({ bind }) => {
  bind<GymRepository>(TYPES.Repositories.Gym).toDynamicValue(
    GymRepositoryProvider.provide,
  )
  bind(TYPES.Controllers.CreateGym).to(CreateGymController)
  bind(TYPES.Controllers.SearchGym).to(SearchGymController)
  bind(TYPES.UseCases.CreateGym).to(CreateGymUseCase)
  bind(TYPES.UseCases.SearchGym).to(SearchGymUseCase)
  bind(TYPES.UseCases.FetchNearbyGym).to(FetchNearbyGym)
})
