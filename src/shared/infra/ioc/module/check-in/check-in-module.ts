import { ContainerModule } from "inversify"

import { CheckInUseCase } from "@/check-in/application/use-case/check-in.usecase"
import { CheckInHistoryUseCase } from "@/check-in/application/use-case/check-in-history.usecase"
import { ValidateCheckInUseCase } from "@/check-in/application/use-case/validate-check-in.usecase"
import { CheckInController } from "@/check-in/infra/controller/check-in.controller"
import { ValidateCheckInController } from "@/check-in/infra/controller/validate-check-in.controller"

import { CHECKIN_TYPES } from "../../types"
import { CheckInRepositoryProvider } from "./check-in-repository-provider"

export const checkInModule = new ContainerModule(({ bind }) => {
	bind(CHECKIN_TYPES.Repositories.CheckIn)
		.toDynamicValue(CheckInRepositoryProvider.provide)
		.inSingletonScope()
	bind(CHECKIN_TYPES.Controllers.ValidateCheckIn).to(ValidateCheckInController)
	bind(CHECKIN_TYPES.Controllers.CheckIn).to(CheckInController)
	bind(CHECKIN_TYPES.UseCases.CheckIn).to(CheckInUseCase)
	bind(CHECKIN_TYPES.UseCases.CheckInHistory).to(CheckInHistoryUseCase)
	bind(CHECKIN_TYPES.UseCases.ValidateCheckIn).to(ValidateCheckInUseCase)
})
