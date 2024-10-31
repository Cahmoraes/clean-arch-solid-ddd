import 'reflect-metadata'

import { User } from '@/domain/user'

import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import type { UserRepository } from '../repository/user-repository'
import { CreateUserUseCase } from './create-user.usecase'

const mockUserRepository = {
  findByEmail: vi.fn(),
  create: vi.fn(),
}

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase

  beforeEach(() => {
    createUserUseCase = new CreateUserUseCase(
      mockUserRepository as unknown as UserRepository,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new user successfully', async () => {
    const input = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      rawPassword: 'password123',
    }
    mockUserRepository.findByEmail.mockResolvedValue(null)
    mockUserRepository.create.mockResolvedValue(undefined)
    vi.spyOn(User, 'create').mockResolvedValue({} as User)

    await createUserUseCase.execute(input)

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email)
    expect(User.create).toHaveBeenCalledWith({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
    })
    expect(mockUserRepository.create).toHaveBeenCalled()
  })

  it('should throw UserAlreadyExistsError if user already exists', async () => {
    const input = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      rawPassword: 'password123',
    }
    mockUserRepository.findByEmail.mockResolvedValueOnce({} as User)

    await expect(createUserUseCase.execute(input)).rejects.toThrow(
      UserAlreadyExistsError,
    )
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email)
    expect(mockUserRepository.create).not.toHaveBeenCalled()
  })
})
