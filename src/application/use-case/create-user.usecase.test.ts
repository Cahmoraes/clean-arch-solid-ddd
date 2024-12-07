import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

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
    userRepository = setupInMemoryRepositories().userRepository
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
    expect(result.forceSuccess().value.email).toBe(input.email)
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
    expect(result.forceFailure().value).toBeInstanceOf(UserAlreadyExistsError)
  })
})
