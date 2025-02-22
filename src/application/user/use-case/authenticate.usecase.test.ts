import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { User, type UserCreate } from '@/domain/user/user'
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
    userRepository = setupInMemoryRepositories().userRepository
    sut = container.get(TYPES.UseCases.Authenticate)
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
    expect(result.forceSuccess().value).toBeDefined()
    expect(result.forceSuccess().value.token).toEqual(expect.any(String))
  })

  test('Não deve autenticar um usuário inexistente', async () => {
    const input: AuthenticateUseCaseInput = {
      email: 'john@doe.com',
      password: 'any_password',
    }
    const result = await sut.execute(input)
    expect(result.forceFailure().value).toBeInstanceOf(InvalidCredentialsError)
  })

  test('Não deve autenticar um usuário com senha inválida', async () => {
    const input: AuthenticateUseCaseInput = {
      email: 'john@doe.com',
      password: 'any_password',
    }

    await createAndSaveUser({
      name: 'John Doe',
      email: input.email,
      password: input.password,
    })

    const result = await sut.execute({
      ...input,
      password: 'invalid_password',
    })

    expect(result.forceFailure().value).toBeInstanceOf(InvalidCredentialsError)
  })

  async function createAndSaveUser(userProps: UserCreate): Promise<User> {
    const user = makeUser(userProps)
    await saveUser(user.force.success().value)
    return user.force.success().value

    function makeUser(userProps: UserCreate) {
      return User.create(userProps)
    }

    async function saveUser(anUser: User) {
      userRepository.save(anUser)
    }
  }
})
