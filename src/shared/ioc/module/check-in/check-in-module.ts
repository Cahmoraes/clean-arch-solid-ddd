import { ContainerModule, type interfaces } from 'inversify'

import { CheckInUseCase } from '@/application/use-case/checkin.usecase'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory-check-in-repository'

import { TYPES } from '../../types'

export const checkInModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.UseCases.CreateCheckIn).to(CheckInUseCase)
  bind(TYPES.Repositories.CheckIn).to(InMemoryCheckInRepository)
})
