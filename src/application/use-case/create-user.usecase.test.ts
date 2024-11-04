import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import type { UserRepository } from '../repository/user-repository'
import {
  CreateUserUseCase,
  type CreateUserUseCaseInput,
} from './create-user.usecase'

describe('CreateUserUseCase', () => {
  let sut: CreateUserUseCase
  let userRepository: UserRepository

  beforeEach(() => {
    container.snapshot()
    container.unbind(TYPES.Repositories.User)
    userRepository = new InMemoryUserRepository()
    container.bind(TYPES.Repositories.User).toConstantValue(userRepository)
    userRepository = container.get(TYPES.Repositories.User)
    sut = container.get(TYPES.UseCases.CreateUser)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve criar um usuário', async () => {
    const input: CreateUserUseCaseInput = {
      name: 'John Doe',
      email: 'john@doe.com',
      rawPassword: 'any_password',
    }
    const result = await sut.execute(input)
    const user = await userRepository.findByEmail(input.email)
    expect(result.forceRight().value.email).toBe(input.email)
    expect(user?.id).toBeDefined()
    expect(user?.name).toBe(input.name)
    expect(user?.email).toBe(input.email)
    expect(user?.password).toEqual(expect.any(String))
    expect(user?.createdAt).toEqual(expect.any(Date))
  })

  test('Não deve criar um usuário com email já existente', async () => {
    const input: CreateUserUseCaseInput = {
      name: 'John Doe',
      email: 'john@doe.com',
      rawPassword: 'any_password',
    }
    await sut.execute(input)
    const result = await sut.execute(input)
    expect(result.forceLeft().value).toBeInstanceOf(UserAlreadyExistsError)
  })
})
