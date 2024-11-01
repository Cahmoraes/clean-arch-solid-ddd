import { type CreateUserProps, User } from '@/domain/user'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import { InvalidCredentialsError } from '../error/invalid-credentials-error'
import type { UserRepository } from '../repository/user-repository'
import type {
  AuthenticateUseCase,
  AuthenticateUseCaseInput,
} from './authenticate.usecase'

describe('AuthenticateUseCase', () => {
  let sut: AuthenticateUseCase
  let userRepository: UserRepository

  beforeEach(() => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    container.unbind(TYPES.UserRepository)
    container.bind(TYPES.UserRepository).toConstantValue(userRepository)
    sut = container.get(TYPES.AuthenticateUseCase)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve autenticar um usuário', async () => {
    const input: AuthenticateUseCaseInput = {
      email: 'john@doe.com',
      password: 'any_password',
    }

    await createAndSaveUser({
      name: 'John Doe',
      email: input.email,
      password: input.password,
    })

    const result = await sut.execute(input)
    expect(result.token).toBeDefined()
    expect(result.token).toEqual(expect.any(String))
  })

  test('Não deve autenticar um usuário', async () => {
    const input: AuthenticateUseCaseInput = {
      email: 'john@doe.com',
      password: 'any_password',
    }
    await expect(() => sut.execute(input)).rejects.toThrow(
      InvalidCredentialsError,
    )
  })

  async function createAndSaveUser(userProps: CreateUserProps): Promise<User> {
    const user = makeUser(userProps)
    await saveUser(user)
    return user

    function makeUser(userProps: CreateUserProps) {
      return User.create(userProps)
    }

    async function saveUser(anUser: User) {
      userRepository.create(anUser)
    }
  }
})
