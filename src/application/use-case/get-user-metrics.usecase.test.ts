import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'

import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import type { GetMetricsUseCase } from './get-user-metrics.usecase'

describe('GetUserMetricsUseCase', () => {
  let sut: GetMetricsUseCase
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(() => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    container
      .rebind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    sut = container.get<GetMetricsUseCase>(TYPES.UseCases.GetMetrics)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve retornar a quantidade de check-ins do usuário', async () => {
    const userId = '1'
    await createAndSaveCheckIn({
      checkInRepository,
      id: '1',
      userId,
      gymId: 'gymId1',
      userLatitude: 0,
      userLongitude: 0,
    })

    const output = await sut.execute({ userId })

    expect(output.checkInsCount).toBe(1)
  })
})
