import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { Gym } from '@/domain/gym/gym'
import { DomainEventPublisher } from '@/domain/shared/event/domain-event-publisher'
import { EVENTS } from '@/domain/shared/event/events'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import { UserHasAlreadyCheckedInToday } from '../../user/error/user-has-already-checked-in-today'
import { UserNotFoundError } from '../../user/error/user-not-found-error'
import { GymNotFoundError } from '../../user/error/user-not-found-error copy'
import { MaxDistanceError } from '../error/max-distance-error'
import { CheckInUseCase, type CheckInUseCaseInput } from './check-in.usecase'

vi.mock(
  '@/infra/database/repository/unit-of-work/prisma-unit-of-work',
  async () => {
    return {
      PrismaUnitOfWork: vi.fn().mockImplementation(() => ({
        async performTransaction(callback: (tx: any) => Promise<any>) {
          return await callback({})
        },
      })),
    }
  },
)

describe('CheckInUseCase', () => {
  let gymRepository: InMemoryGymRepository
  let userRepository: InMemoryUserRepository
  let checkInRepository: InMemoryCheckInRepository
  let sut: CheckInUseCase

  beforeEach(async () => {
    container.snapshot()
    const repositories = await setupInMemoryRepositories()
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
    expect(result.forceSuccess().value.checkInId).toEqual(expect.any(String))
    expect(result.forceSuccess().value.date).toEqual(expect.any(Date))
    const checkInSaved = checkInRepository.checkIns.toArray()[0]
    expect(checkInSaved.id).toEqual(result.forceSuccess().value.checkInId)
    const hasCheckInCreatedEvent = DomainEventPublisher.instance[
      'subscribers'
    ].has(EVENTS.CHECK_IN_CREATED)
    expect(hasCheckInCreatedEvent).toBe(true)
  })

  test('Não deve criar um check-in se o usuário não existir', async () => {
    const input: CheckInUseCaseInput = {
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceFailure().value).toBeInstanceOf(UserNotFoundError)
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
    expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
  })

  test('Não deve criar dois check-ins no mesmo dia', async () => {
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
    expect(result.forceFailure().value).toBeInstanceOf(
      UserHasAlreadyCheckedInToday,
    )
  })

  test('Deve criar dois check-ins no mesmo dia para usuários diferentes', async () => {
    const user_one_Id = 'any_user_one_id'
    await createAndSaveUser({
      userRepository,
      id: user_one_Id,
    })

    const user_two_Id = 'any_user_two_id'
    await createAndSaveUser({
      userRepository,
      id: user_two_Id,
    })

    await _createAndSaveGym('any_gym_id', -27.0747279, -49.4889672)
    const inputUserOne: CheckInUseCaseInput = {
      userId: user_one_Id,
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    await sut.execute(inputUserOne)

    const inputUserTwo: CheckInUseCaseInput = {
      userId: user_two_Id,
      gymId: 'any_gym_id',
      userLatitude: -27.0747279,
      userLongitude: -49.4889672,
    }
    const result = await sut.execute(inputUserTwo)
    expect(result.forceSuccess().value.checkInId).toEqual(expect.any(String))
  })

  test('Não deve ser possível criar um check-in distante de 100 metros', async () => {
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
      userLongitude: -48.4889672,
    }
    const result = await sut.execute(input)
    expect(result.forceFailure().value).toBeInstanceOf(MaxDistanceError)
  })

  async function _createAndSaveGym(id?: string, latitude = 0, longitude = 0) {
    const gymId = id ?? 'any_gym_id'
    const gym = Gym.create({
      id: gymId,
      title: 'any_name',
      latitude,
      longitude,
    }).forceSuccess().value
    await gymRepository.save(gym)
    return gymRepository.gyms.toArray()[0]
  }
})
