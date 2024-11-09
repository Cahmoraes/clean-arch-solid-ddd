import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { Gym } from '@/domain/gym'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { MaxDistanceError } from '../error/max-distance-error'
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
    const repositories = setupInMemoryRepositories()
    gymRepository = repositories.gymRepository
    userRepository = repositories.userRepository
    checkInRepository = repositories.checkInRepository
    sut = container.get<CheckInUseCase>(TYPES.UseCases.CheckIn)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve criar um check-in', async () => {
    const userId = 'any_user_id'
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
    const gymId = 'any_gym_id'
    await _createAndSaveGym(gymId, -27.0747279, -49.4889672)
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
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
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
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
    await _createAndSaveGym('any_gym_id', -27.0747279, -49.4889672)
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
    await createAndSaveUser({
      userRepository,
      id: userId,
    })
    await _createAndSaveGym('any_gym_id', -27.0747279, -49.4889672)
    await _createAndSaveGym('any_gym_id', -27.0747279, -49.4889672)
    const input: CheckInUseCaseInput = {
      userId,
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -48.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceLeft().value).toBeInstanceOf(MaxDistanceError)
  })

  async function _createAndSaveGym(id?: string, latitude = 0, longitude = 0) {
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
