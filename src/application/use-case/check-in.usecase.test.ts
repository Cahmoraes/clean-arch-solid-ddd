import { Gym } from '@/domain/gym'
import { User } from '@/domain/user'
import type { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { UserHasAlreadyCheckedInToday } from '../error/user-has-already-checked-in-today'
import { UserNotFoundError } from '../error/user-not-found-error'
import { GymNotFoundError } from '../error/user-not-found-error copy'
import { CheckInUseCase, type CheckInUseCaseInput } from './check-in.usecase'

describe('CheckInUseCase', () => {
  let gymRepository: InMemoryGymRepository
  let userRepository: InMemoryUserRepository
  let checkInRepository: InMemoryCheckInRepository
  let sut: CheckInUseCase

  beforeEach(() => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    userRepository = new InMemoryUserRepository()
    container.rebind(TYPES.Repositories.Gym).toConstantValue(gymRepository)
    container.rebind(TYPES.Repositories.User).toConstantValue(userRepository)
    sut = container.get<CheckInUseCase>(TYPES.UseCases.CheckIn)
    checkInRepository = sut['checkInRepository'] as InMemoryCheckInRepository
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve criar um check-in', async () => {
    const userId = 'any_user_id'
    await createAndSaveUser(userId)
    const gymId = 'any_gym_id'
    await createAndSaveGym(gymId, -27.0747279, -49.4889672)
    const input: CheckInUseCaseInput = {
      userId,
      gymId,
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceRight().value.checkInId).toEqual(expect.any(String))
    expect(result.forceRight().value.date).toEqual(expect.any(Date))
    const checkInSaved = checkInRepository.checkIns.toArray()[0]
    expect(checkInSaved.id).toEqual(result.forceRight().value.checkInId)
  })

  test('Não deve criar um check-in se o usuário não existir', async () => {
    const input: CheckInUseCaseInput = {
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceLeft().value).toBeInstanceOf(UserNotFoundError)
  })

  test('Não deve criar um check-in se a academia não existir', async () => {
    const userId = 'any_user_id'
    await createAndSaveUser(userId)
    const input: CheckInUseCaseInput = {
      userId,
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceLeft().value).toBeInstanceOf(GymNotFoundError)
  })

  test('Não deve criar um check-in no mesmo dia', async () => {
    const userId = 'any_user_id'
    await createAndSaveUser()
    await createAndSaveGym('any_gym_id', -27.0747279, -49.4889672)
    const input: CheckInUseCaseInput = {
      userId,
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    await sut.execute(input)
    const result = await sut.execute(input)
    expect(result.forceLeft().value).toBeInstanceOf(
      UserHasAlreadyCheckedInToday,
    )
  })

  test('Não deve ser possível criar um check-in distante de 100 metros', async () => {
    const userId = 'any_user_id'
    await createAndSaveUser(userId)
    await createAndSaveGym('any_gym_id', -27.0747279, -49.4889672)
    const input: CheckInUseCaseInput = {
      userId,
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -48.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceLeft().value).toBeInstanceOf(Error)
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

  async function createAndSaveGym(id?: string, latitude = 0, longitude = 0) {
    const gymId = id ?? 'any_gym_id'
    const gym = Gym.create({
      id: gymId,
      title: 'any_name',
      latitude,
      longitude,
    })
    await gymRepository.save(gym)
    return gymRepository.gyms.toArray()[0]
  }
})
