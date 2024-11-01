import { describe, expect, it, vi } from 'vitest'

import { User } from '@/domain/user'

import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import type { UserRepository } from '../repository/user-repository'
import { CreateUserUseCase } from './create-user.usecase'

describe('CreateUserUseCase', () => {
  const mockUserRepository: UserRepository = {
    findByEmail: vi.fn(),
    create: vi.fn(),
  }

  const createUserUseCase = new CreateUserUseCase(mockUserRepository)

  const input = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    rawPassword: 'password123',
  }

  it('should create a new user successfully', async () => {
    vi.spyOn(mockUserRepository, 'findByEmail').mockResolvedValue(null)
    vi.spyOn(mockUserRepository, 'create').mockResolvedValue()

    await createUserUseCase.execute(input)

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email)
    expect(mockUserRepository.create).toHaveBeenCalled()
  })

  it('should throw UserAlreadyExistsError if user already exists', async () => {
    vi.spyOn(mockUserRepository, 'findByEmail').mockResolvedValue(new User())

    await expect(createUserUseCase.execute(input)).rejects.toThrow(
      UserAlreadyExistsError,
    )
  })
})
