import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import type {
  CheckInHistoryUseCase,
  CheckInHistoryUseCaseInput,
} from './check-in-history.usecase'

describe('CheckInHistoryUseCase', () => {
  let sut: CheckInHistoryUseCase
  let userRepository: InMemoryUserRepository
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(() => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    checkInRepository = repositories.checkInRepository
    sut = container.get<CheckInHistoryUseCase>(TYPES.UseCases.CheckInHistory)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve listar o histórico de check-ins', async () => {
    const userId = 'userId'
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
    const input: CheckInHistoryUseCaseInput = {
      userId,
    }
    await createAndSaveCheckIn({
      checkInRepository,
      id: '1',
      userId,
      gymId: 'gymId1',
      userLatitude: 0,
      userLongitude: 0,
    })
    const result = await sut.execute(input)
    expect(Array.isArray(result.checkIns)).toBe(true)
    const checkIn = result.checkIns[0]
    expect(result.userId).toBe(userId)
    expect(checkIn.id).toBe('1')
    expect(checkIn.checkInAt).toBeInstanceOf(Date)
    expect(checkIn.location.latitude).toBe(0)
    expect(checkIn.location.longitude).toBe(0)
  })

  test('Não deve listar o histórico de check-ins para um usuário inexistente', async () => {
    const input: CheckInHistoryUseCaseInput = {
      userId: '1',
    }
    const result = await sut.execute(input)
    expect(result.checkIns).toHaveLength(0)
  })

  test('Deve listar múltiplos check-ins para um usuário', async () => {
    const userId = 'userId'
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
    for (let i = 0; i <= 22; i++) {
      await createAndSaveCheckIn({
        checkInRepository,
        id: i.toString(),
        userId,
        gymId: 'gymId1',
        userLatitude: 0,
        userLongitude: 0,
      })
    }
    const input: CheckInHistoryUseCaseInput = {
      userId,
      page: 2,
    }
    const result = await sut.execute(input)
    expect(result.checkIns).toHaveLength(3)
    expect(result.checkIns[0].id).toBe('20')
    expect(result.checkIns[1].id).toBe('21')
    expect(result.checkIns[2].id).toBe('22')
  })

  test('Deve retornar check-ins vazios se o usuário não tiver check-ins', async () => {
    const userId = 'userId'
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
    const input: CheckInHistoryUseCaseInput = {
      userId,
    }
    const result = await sut.execute(input)
    expect(result.checkIns).toHaveLength(0)
  })
})
