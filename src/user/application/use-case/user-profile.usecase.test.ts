import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import { User, type UserCreate } from '@/user/domain/user'

import { UserNotFoundError } from '../error/user-not-found-error'
import {
  UserProfileUseCase,
  type UserProfileUseCaseInput,
} from './user-profile.usecase'

describe('UserProfile', () => {
  let sut: UserProfileUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    userRepository = (await setupInMemoryRepositories()).userRepository
    sut = container.get<UserProfileUseCase>(USER_TYPES.UseCases.UserProfile)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve obter os dados de um usuário', async () => {
    const userCreateProps: UserCreate = {
      name: 'any_name',
      email: 'john@email.com',
      password: 'any_password',
    }
    const user = User.create(userCreateProps)
    await userRepository.save(user.forceSuccess().value)
    const savedUser = userRepository.users.toArray()[0]
    const input: UserProfileUseCaseInput = {
      userId: savedUser.id!,
    }
    const leftOrRight = await sut.execute(input)
    const result = leftOrRight.force.success().value
    expect(result.id).toBe(input.userId)
    expect(result.name).toBe(userCreateProps.name)
    expect(result.email).toBe(userCreateProps.email)
  })

  test('Deve retornar erro se o usuário não for encontrado', async () => {
    const input: UserProfileUseCaseInput = {
      userId: 'invalid_id',
    }
    const leftOrRight = await sut.execute(input)
    const result = leftOrRight.force.failure().value
    expect(result).toBeInstanceOf(UserNotFoundError)
  })
})
