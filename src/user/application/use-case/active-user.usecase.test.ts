import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import type { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import { User } from '@/user/domain/user'

import { UserNotFoundError } from '../error/user-not-found-error'
import {
  ActiveUserUseCase,
  type ActiveUserUseCaseInput,
} from './active-user.usecase'

describe('ActiveUserUseCase', () => {
  let sut: ActiveUserUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    const repositories = await setupInMemoryRepositories()
    userRepository = repositories.userRepository
    sut = container.get(USER_TYPES.UseCases.ActivateUser)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve ativar um usuário', async () => {
    const input: ActiveUserUseCaseInput = {
      userId: 'any_user_id',
    }
    const user = User.create({
      email: 'user@email.com',
      name: 'any_name',
      password: 'any_password',
      id: input.userId,
      status: 'suspended',
    }).forceSuccess().value
    await userRepository.save(user)
    await sut.execute(input)
    const userFound = await userRepository.userOfId(input.userId)
    expect(userFound?.isActive).toBe(true)
  })

  test('Não deve ativar um usuário inexistente', async () => {
    const input: ActiveUserUseCaseInput = {
      userId: 'any_user_id',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })
})
