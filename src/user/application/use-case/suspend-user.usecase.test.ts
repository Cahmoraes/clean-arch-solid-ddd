import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import type { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { USER_TYPES } from '@/shared/infra/ioc/types'
import { User } from '@/user/domain/user'

import { UserNotFoundError } from '../error/user-not-found-error'
import {
  SuspendUserUseCase,
  type SuspendUserUseCaseInput,
} from './suspend-user.usecase'

describe('SuspendUserUseCase', () => {
  let sut: SuspendUserUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    const repositories = await setupInMemoryRepositories()
    userRepository = repositories.userRepository
    sut = container.get(USER_TYPES.UseCases.SuspendUser)
  })

  beforeEach(() => {
    container.restore()
  })

  test('Deve suspender um usuário', async () => {
    const input: SuspendUserUseCaseInput = {
      userId: 'any_user_id',
    }
    const user = User.create({
      email: 'user@email.com',
      name: 'any_name',
      password: 'any_password',
      id: input.userId,
    }).forceSuccess().value
    await userRepository.save(user)
    await sut.execute(input)
    const userFound = await userRepository.userOfId(input.userId)
    expect(userFound?.isActive).toBe(false)
  })

  test('Não deve suspender um usuário inexistente', async () => {
    const input: SuspendUserUseCaseInput = {
      userId: 'any_user_id',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })
})
