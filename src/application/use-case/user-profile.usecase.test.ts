import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { User, type UserCreateProps } from '@/domain/user'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import {
  UserProfileUseCase,
  type UserProfileUseCaseInput,
} from './user-profile.usecase'

describe('UserProfile', () => {
  let sut: UserProfileUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(() => {
    container.snapshot()
    userRepository = setupInMemoryRepositories().userRepository
    sut = container.get<UserProfileUseCase>(TYPES.UseCases.UserProfile)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve obter os dados de um usuário', async () => {
    const userCreateProps: UserCreateProps = {
      name: 'any_name',
      email: 'john@email.com',
      password: 'any_password',
    }
    const user = User.create(userCreateProps)
    await userRepository.save(user.forceRight().value)
    const savedUser = userRepository.users.toArray()[0]
    const input: UserProfileUseCaseInput = {
      userId: savedUser.id!,
    }
    const leftOrRight = await sut.execute(input)
    const result = leftOrRight.force.right().value
    expect(result.id).toBe(input.userId)
    expect(result.name).toBe(userCreateProps.name)
    expect(result.email).toBe(userCreateProps.email)
  })

  test('Deve retornar erro se o usuário não for encontrado', async () => {
    const input: UserProfileUseCaseInput = {
      userId: 'invalid_id',
    }
    const leftOrRight = await sut.execute(input)
    const result = leftOrRight.force.left().value
    expect(result).toBeInstanceOf(UserNotFoundError)
  })
})
