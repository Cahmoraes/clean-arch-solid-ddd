import {
  createAndSaveCheckIn,
  type CreateAndSaveCheckInProps,
} from 'test/factory/create-and-save-check-in'

import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import {
  ValidateCheckInUseCase,
  type ValidateCheckInUseCaseInput,
} from './validate-check-in.usecase'

describe('ValidateCheckIn', () => {
  let sut: ValidateCheckInUseCase
  let checkInRepository: InMemoryCheckInRepository
  let userRepository: InMemoryUserRepository

  beforeEach(() => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    container
      .rebind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    container.rebind(TYPES.Repositories.User).toConstantValue(userRepository)
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
    const right = result.force.right().value
    expect(right.validatedAt).toBeInstanceOf(Date)
    expect(right.validatedAt).toBeInstanceOf(Date)
    expect(checkIn.isValidated).toBe(true)
  })
})
