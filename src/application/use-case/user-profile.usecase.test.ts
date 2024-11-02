import { User, type UserCreateProps } from '@/domain/user'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
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
    userRepository = new InMemoryUserRepository()
    container.snapshot()
    container.rebind(TYPES.Repositories.User).toConstantValue(userRepository)
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
      id: savedUser.id!,
    }
    const leftOrRight = await sut.execute(input)
    const result = leftOrRight.force.right().value
    expect(result.id).toBe(input.id)
    expect(result.name).toBe(userCreateProps.name)
    expect(result.email).toBe(userCreateProps.email)
  })

  test('Deve retornar erro se o usuário não for encontrado', async () => {
    const input: UserProfileUseCaseInput = {
      id: 'invalid_id',
    }
    const leftOrRight = await sut.execute(input)
    const result = leftOrRight.force.left().value
    expect(result).toBeInstanceOf(UserNotFoundError)
  })
})
