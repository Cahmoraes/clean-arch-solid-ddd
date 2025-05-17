import {
  createAndSaveCheckIn,
  type CreateAndSaveCheckInProps,
} from 'test/factory/create-and-save-check-in'

import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import { CheckInTimeExceededError } from '../../../domain/check-in/error/check-in-time-exceeded-error'
import { CheckInNotFoundError } from '../error/check-in-not-found-error'
import {
  ValidateCheckInUseCase,
  type ValidateCheckInUseCaseInput,
} from './validate-check-in.usecase'

describe('ValidateCheckIn', () => {
  let sut: ValidateCheckInUseCase
  let checkInRepository: InMemoryCheckInRepository
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    container
      .rebindSync(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    container
      .rebindSync(TYPES.Repositories.User)
      .toConstantValue(userRepository)
    sut = container.get(TYPES.UseCases.ValidateCheckIn)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve validar um check-in', async () => {
    const createCheckInProps: CreateAndSaveCheckInProps = {
      checkInRepository,
      gymId: 'any_gym_id',
      id: 'check-in-id',
      userId: 'any_user_id',
    }
    const checkIn = await createAndSaveCheckIn(createCheckInProps)
    const input: ValidateCheckInUseCaseInput = {
      checkInId: checkIn.id!,
    }
    const result = await sut.execute(input)
    const right = result.force.success().value
    expect(right.validatedAt).toBeInstanceOf(Date)
    expect(right.validatedAt).toBeInstanceOf(Date)
    expect(checkIn.isValidated).toBe(true)
  })

  test('Não deve validar um check-in após o tempo limite', async () => {
    vi.useFakeTimers()
    const createCheckInProps: CreateAndSaveCheckInProps = {
      checkInRepository,
      gymId: 'any_gym_id',
      id: 'check-in-id',
      userId: 'any_user_id',
    }
    const checkIn = await createAndSaveCheckIn(createCheckInProps)
    const input: ValidateCheckInUseCaseInput = {
      checkInId: checkIn.id!,
    }
    const TWENTY_ON_MINUTES = 1000 * 60 * 21
    vi.advanceTimersByTime(TWENTY_ON_MINUTES)
    const result = await sut.execute(input)
    const right = result.force.failure().value
    expect(right).toBeInstanceOf(CheckInTimeExceededError)
    vi.useRealTimers()
  })

  test('Não deve validar um check-in inexistente', async () => {
    const input: ValidateCheckInUseCaseInput = {
      checkInId: 'non-existent-id',
    }
    const result = await sut.execute(input)
    const left = result.force.failure().value
    expect(left).toBeInstanceOf(CheckInNotFoundError)
  })
})
