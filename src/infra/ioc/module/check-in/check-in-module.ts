import { ContainerModule } from 'inversify'

import { CheckInUseCase } from '@/application/check-in/use-case/check-in.usecase'
import { CheckInHistoryUseCase } from '@/application/check-in/use-case/check-in-history.usecase'
import { ValidateCheckInUseCase } from '@/application/check-in/use-case/validate-check-in.usecase'
import { CheckInController } from '@/infra/controller/check-in/check-in.controller'
import { ValidateCheckInController } from '@/infra/controller/check-in/validate-check-in.controller'

import { TYPES } from '../../types'
import { CheckInRepositoryProvider } from './check-in-repository-provider'

export const checkInModule = new ContainerModule(({ bind }) => {
  bind(TYPES.Repositories.CheckIn)
    .toDynamicValue(CheckInRepositoryProvider.provide)
    .inSingletonScope()
  bind(TYPES.Controllers.ValidateCheckIn).to(ValidateCheckInController)
  bind(TYPES.Controllers.CheckIn).to(CheckInController)
  bind(TYPES.UseCases.CheckIn).to(CheckInUseCase)
  bind(TYPES.UseCases.CheckInHistory).to(CheckInHistoryUseCase)
  bind(TYPES.UseCases.ValidateCheckIn).to(ValidateCheckInUseCase)
})
