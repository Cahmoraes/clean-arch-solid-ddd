import { Container } from 'inversify'
import { beforeEach, describe, expect, it } from 'vitest'

import { User } from '@/domain/user'
import { TYPES } from '@/infra/ioc/types'

import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import { UserRepository } from '../repository/user-repository'
import { CreateUserUseCase } from './create-user.usecase'

describe('CreateUserUseCase', () => {
  let container: Container
  let createUserUseCase: CreateUserUseCase
  let userRepository: UserRepository

  beforeEach(() => {
    container = new Container()
    userRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    } as unknown as UserRepository

    container
      .bind<UserRepository>(TYPES.UserRepository)
      .toConstantValue(userRepository)
    createUserUseCase = container.resolve(CreateUserUseCase)
  })

  it('should create a new user successfully', async () => {
    const input = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      rawPassword: 'password123',
    }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)
    vi.spyOn(User, 'create').mockReturnValue({} as User)

    await createUserUseCase.execute(input)

    expect(userRepository.findByEmail).toHaveBeenCalledWith(input.email)
    expect(User.create).toHaveBeenCalledWith({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
    })
    expect(userRepository.create).toHaveBeenCalled()
  })

  it('should throw UserAlreadyExistsError if user already exists', async () => {
    const input = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      rawPassword: 'password123',
    }
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValue({} as User)

    await expect(createUserUseCase.execute(input)).rejects.toThrow(
      UserAlreadyExistsError,
    )
    expect(userRepository.findByEmail).toHaveBeenCalledWith(input.email)
    expect(userRepository.create).not.toHaveBeenCalled()
  })
})
