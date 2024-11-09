import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import type { GetMetricsUseCase } from './get-user-metrics.usecase'

describe('GetUserMetricsUseCase', () => {
  let sut: GetMetricsUseCase
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(() => {
    container.snapshot()
    checkInRepository = setupInMemoryRepositories().checkInRepository
    sut = container.get<GetMetricsUseCase>(TYPES.UseCases.GetMetrics)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve retornar a quantidade de 0 check-ins do usuário', async () => {
    const userId = '1'
    const output = await sut.execute({ userId })
    expect(output.checkInsCount).toBe(0)
  })

  test('Deve retornar a quantidade de 1 check-ins do usuário', async () => {
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

  test('Deve retornar a quantidade de 10 check-ins do usuário', async () => {
    const userId = '1'
    for (let i = 0; i < 10; i++) {
      await createAndSaveCheckIn({
        checkInRepository,
        id: i.toString(),
        userId,
        gymId: 'gymId1',
        userLatitude: 0,
        userLongitude: 0,
      })
    }
    const output = await sut.execute({ userId })
    expect(output.checkInsCount).toBe(10)
  })
})
