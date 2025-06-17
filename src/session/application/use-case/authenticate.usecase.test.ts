import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { env } from '@/shared/infra/env'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import type { AuthToken } from '@/user/application/auth/auth-token'
import { User, type UserCreate } from '@/user/domain/user'

import { InvalidCredentialsError } from '../../../user/application/error/invalid-credentials-error'
import type { UserRepository } from '../../../user/application/repository/user-repository'
import type {
  AuthenticateUseCase,
  AuthenticateUseCaseInput,
} from './authenticate.usecase'

interface JWTResponse {
  sub: {
    id: string
    email: string
    role: string
    sessionId: string
  }
}

describe('AuthenticateUseCase', () => {
  let sut: AuthenticateUseCase
  let userRepository: UserRepository
  let authToken: AuthToken

  beforeEach(async () => {
    container.snapshot()
    userRepository = (await setupInMemoryRepositories()).userRepository
    sut = container.get(TYPES.UseCases.Authenticate)
    authToken = container.get(TYPES.Tokens.Auth)
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
    const { token, refreshToken } = result.force.success().value
    expect(token).toEqual(expect.any(String))
    expect(refreshToken).toEqual(expect.any(String))
    const jwtResult = authToken
      .verify<JWTResponse>(token, env.PRIVATE_KEY)
      .force.success().value
    const refreshTokenResult = authToken
      .verify<JWTResponse>(refreshToken, env.PRIVATE_KEY)
      .force.success().value
    expect(jwtResult.sub).toMatchObject(refreshTokenResult.sub)
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
