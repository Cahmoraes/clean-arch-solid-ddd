import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import type { UserMetricsUseCase } from './user-metrics.usecase'

describe('UserMetricsUseCase', () => {
  let sut: UserMetricsUseCase
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(() => {
    container.snapshot()
    checkInRepository = setupInMemoryRepositories().checkInRepository
    sut = container.get<UserMetricsUseCase>(TYPES.UseCases.UserMetrics)
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
