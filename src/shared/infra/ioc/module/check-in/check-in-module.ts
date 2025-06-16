import { ContainerModule } from 'inversify'

import { CheckInUseCase } from '@/check-in/application/use-case/check-in.usecase'
import { CheckInHistoryUseCase } from '@/check-in/application/use-case/check-in-history.usecase'
import { ValidateCheckInUseCase } from '@/check-in/application/use-case/validate-check-in.usecase'
import { CheckInController } from '@/check-in/infra/controller/check-in.controller'
import { ValidateCheckInController } from '@/check-in/infra/controller/validate-check-in.controller'

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
