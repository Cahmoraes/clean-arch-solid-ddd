import { ContainerModule } from "inversify"

import type { GymRepository } from "@/gym/application/repository/gym-repository"
import { CreateGymUseCase } from "@/gym/application/use-case/create-gym.usecase"
import { FetchNearbyGym } from "@/gym/application/use-case/fetch-nearby-gym.usecase"
import { SearchGymUseCase } from "@/gym/application/use-case/search-gym.usecase"
import { CreateGymController } from "@/gym/infra/controller/create-gym.controller"
import { SearchGymController } from "@/gym/infra/controller/search-gym.controller"

import { GYM_TYPES } from "../../types"
import { GymRepositoryProvider } from "./gym-repository-provider"

export const gymModule = new ContainerModule(({ bind }) => {
	bind<GymRepository>(GYM_TYPES.Repositories.Gym).toDynamicValue(
		GymRepositoryProvider.provide,
	)
	bind(GYM_TYPES.Controllers.CreateGym).to(CreateGymController)
	bind(GYM_TYPES.Controllers.SearchGym).to(SearchGymController)
	bind(GYM_TYPES.UseCases.CreateGym).to(CreateGymUseCase)
	bind(GYM_TYPES.UseCases.SearchGym).to(SearchGymUseCase)
	bind(GYM_TYPES.UseCases.FetchNearbyGym).to(FetchNearbyGym)
})
