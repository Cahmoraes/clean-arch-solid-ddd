import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import type { UserRepository } from '../repository/user-repository'
import { type CreateUserInput, CreateUserUseCase } from './create-user.usecase'

describe('CreateUserUseCase', () => {
  let sut: CreateUserUseCase
  let userRepository: UserRepository

  beforeEach(() => {
    container.snapshot()
    container.unbind(TYPES.UserRepository)
    userRepository = new InMemoryUserRepository()
    container.bind(TYPES.UserRepository).toConstantValue(userRepository)
    sut = container.get(TYPES.CreateUserUseCase)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve criar um usuário', async () => {
    const input: CreateUserInput = {
      name: 'any_name',
      email: 'any_email',
      rawPassword: 'any_password',
    }
    await sut.execute(input)
    const user = await userRepository.findByEmail(input.email)
    expect(user?.name).toBe(input.name)
    expect(user?.email).toBe(input.email)
    expect(user?.password).toEqual(expect.any(String))
    expect(user?.createdAt).toEqual(expect.any(Date))
  })

  test('Não deve criar um usuário com email já existente', async () => {
    const input: CreateUserInput = {
      name: 'any_name',
      email: 'any_email',
      rawPassword: 'any_password',
    }
    await sut.execute(input)
    await expect(() => sut.execute(input)).to.rejects.toThrow(
      UserAlreadyExistsError,
    )
  })
})
