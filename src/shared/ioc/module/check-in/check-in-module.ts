import { ContainerModule, type interfaces } from 'inversify'

import { CheckInUseCase } from '@/application/use-case/check-in.usecase'
import { CheckInHistoryUseCase } from '@/application/use-case/check-in-history.usecase'
import { GetMetricsUseCase } from '@/application/use-case/get-user-metrics.usecase'
import { CheckInController } from '@/infra/controllers/check-in/check-in.controller'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'

import { TYPES } from '../../types'

export const checkInModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.Controllers.CheckIn).to(CheckInController)
  bind(TYPES.UseCases.CheckIn).to(CheckInUseCase)
  bind(TYPES.Repositories.CheckIn).to(InMemoryCheckInRepository)
  bind(TYPES.UseCases.CheckInHistory).to(CheckInHistoryUseCase)
  bind(TYPES.UseCases.GetMetrics).to(GetMetricsUseCase)
})
