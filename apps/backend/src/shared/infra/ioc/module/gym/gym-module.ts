import { ContainerModule } from "inversify"
import type { GymRepository } from "@/gym/application/repository/gym-repository"
import { CreateGymUseCase } from "@/gym/application/use-case/create-gym.usecase"
import { FetchAllGymsUseCase } from "@/gym/application/use-case/fetch-all-gyms.usecase"
import { FetchGymByIdUseCase } from "@/gym/application/use-case/fetch-gym-by-id.usecase"
import { FetchNearbyGym } from "@/gym/application/use-case/fetch-nearby-gym.usecase"
import { SearchGymUseCase } from "@/gym/application/use-case/search-gym.usecase"
import { SetGymImageUseCase } from "@/gym/application/use-case/set-gym-image.usecase"
import { UpdateGymUseCase } from "@/gym/application/use-case/update-gym.usecase"
import { CreateGymController } from "@/gym/infra/controller/create-gym.controller"
import { FetchAllGymsController } from "@/gym/infra/controller/fetch-all-gyms.controller"
import { FetchGymByIdController } from "@/gym/infra/controller/fetch-gym-by-id.controller"
import { GymImageController } from "@/gym/infra/controller/gym-image.controller"
import { SearchGymController } from "@/gym/infra/controller/search-gym.controller"
import { UpdateGymController } from "@/gym/infra/controller/update-gym.controller"
import { LocalFileSystemImageStorage } from "@/shared/infra/storage/local-file-system-image-storage"
import { SharpImageProcessor } from "@/shared/infra/storage/sharp-image-processor"
import { GYM_TYPES } from "../../types"
import { GymRepositoryProvider } from "./gym-repository-provider"

export const gymModule = new ContainerModule(({ bind }) => {
	bind<GymRepository>(GYM_TYPES.Repositories.Gym).toDynamicValue(
		GymRepositoryProvider.provide,
	)
	bind(GYM_TYPES.Controllers.CreateGym).to(CreateGymController)
	bind(GYM_TYPES.Controllers.UpdateGym).to(UpdateGymController)
	bind(GYM_TYPES.Controllers.SearchGym).to(SearchGymController)
	bind(GYM_TYPES.Controllers.FetchAllGyms).to(FetchAllGymsController)
	bind(GYM_TYPES.Controllers.FetchGymById).to(FetchGymByIdController)
	bind(GYM_TYPES.Controllers.GymImage).to(GymImageController)
	bind(GYM_TYPES.UseCases.CreateGym).to(CreateGymUseCase)
	bind(GYM_TYPES.UseCases.UpdateGym).to(UpdateGymUseCase)
	bind(GYM_TYPES.UseCases.SearchGym).to(SearchGymUseCase)
	bind(GYM_TYPES.UseCases.FetchNearbyGym).to(FetchNearbyGym)
	bind(GYM_TYPES.UseCases.FetchAllGyms).to(FetchAllGymsUseCase)
	bind(GYM_TYPES.UseCases.FetchGymById).to(FetchGymByIdUseCase)
	bind(GYM_TYPES.UseCases.SetGymImage).to(SetGymImageUseCase)
	bind(GYM_TYPES.Services.ImageProcessor).to(SharpImageProcessor)
	bind(GYM_TYPES.Services.ImageStorage).toDynamicValue(
		() => new LocalFileSystemImageStorage(),
	)
})
