import { CheckIn, type CheckInCreateProps } from '@/domain/check-in'
import { User } from '@/domain/user'
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
    userRepository = new InMemoryUserRepository()
    checkInRepository = new InMemoryCheckInRepository()
    container
      .rebind<InMemoryUserRepository>(TYPES.Repositories.User)
      .toConstantValue(userRepository)
    container
      .rebind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    sut = container.get<CheckInHistoryUseCase>(TYPES.UseCases.CheckInHistory)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve listar o histórico de check-ins', async () => {
    const userId = 'userId'
    await createAndSaveUser(userId)
    await createAndSaveCheckIn('1', userId, 'gymId', 0, 0)
    const input: CheckInHistoryUseCaseInput = {
      userId,
    }
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
    await createAndSaveUser(userId)
    await createAndSaveCheckIn('1', userId, 'gymId1', 0, 0)
    await createAndSaveCheckIn('2', userId, 'gymId2', 1, 1)
    const input: CheckInHistoryUseCaseInput = {
      userId,
    }
    const result = await sut.execute(input)
    expect(result.checkIns).toHaveLength(2)
    expect(result.checkIns[0].id).toBe('1')
    expect(result.checkIns[1].id).toBe('2')
  })

  test('Deve retornar check-ins vazios se o usuário não tiver check-ins', async () => {
    const userId = 'userId'
    await createAndSaveUser(userId)
    const input: CheckInHistoryUseCaseInput = {
      userId,
    }
    const result = await sut.execute(input)
    expect(result.checkIns).toHaveLength(0)
  })

  async function createAndSaveUser(id?: string) {
    const userId = id ?? 'any_user_id'
    const user = User.create({
      id: userId,
      name: 'any_name',
      email: 'john@doe.com.br',
      password: 'any_password',
    }).force.right().value
    await userRepository.save(user)
    return userRepository.users.toArray()[0]
  }

  async function createAndSaveCheckIn(
    id?: string,
    userId?: string,
    gymId?: string,
    userLatitude = 0,
    userLongitude = 0,
  ) {
    const input: CheckInCreateProps = {
      id: id ?? 'any_id',
      userId: userId ?? 'any_user_id',
      gymId: gymId ?? 'any_gym_id',
      userLatitude: userLatitude ?? 0,
      userLongitude: userLongitude ?? 10,
    }
    const checkIn = CheckIn.create(input)
    await checkInRepository.save(checkIn)
    return checkInRepository.checkIns.toArray()[0]
  }
})
