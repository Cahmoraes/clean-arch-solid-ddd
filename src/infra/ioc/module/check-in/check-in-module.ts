import { ContainerModule, type interfaces } from 'inversify'

import { CheckInUseCase } from '@/application/use-case/check-in.usecase'
import { CheckInHistoryUseCase } from '@/application/use-case/check-in-history.usecase'
import { UserMetricsUseCase } from '@/application/use-case/user-metrics.usecase'
import { ValidateCheckInUseCase } from '@/application/use-case/validate-check-in.usecase'
import { CheckInController } from '@/infra/controllers/check-in/check-in.controller'
import { MetricsController } from '@/infra/controllers/check-in/metrics.controller'
import { ValidateCheckInController } from '@/infra/controllers/check-in/validate-check-in.controller'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'

import { TYPES } from '../../types'

export const checkInModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.Repositories.CheckIn).to(InMemoryCheckInRepository)
  bind(TYPES.Controllers.UserMetrics).to(MetricsController)
  bind(TYPES.Controllers.ValidateCheckIn).to(ValidateCheckInController)
  bind(TYPES.Controllers.CheckIn).to(CheckInController)
  bind(TYPES.UseCases.CheckIn).to(CheckInUseCase)
  bind(TYPES.UseCases.CheckInHistory).to(CheckInHistoryUseCase)
  bind(TYPES.UseCases.UserMetrics).to(UserMetricsUseCase)
  bind(TYPES.UseCases.ValidateCheckIn).to(ValidateCheckInUseCase)
})
