import { inject, injectable } from 'inversify'

import type { User } from '@/domain/user'
import type { AuthToken } from '@/infra/auth/auth-token'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'

import { type Either, left, right } from '../either'
import { InvalidCredentialsError } from '../error/invalid-credentials-error'
import type { UserRepository } from '../repository/user-repository'

export interface AuthenticateUseCaseInput {
  email: string
  password: string
}

export type AuthenticateUseCaseOutput = Either<
  InvalidCredentialsError,
  {
    token: string
  }
>

@injectable()
export class AuthenticateUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
  ) {}

  public async execute(
    input: AuthenticateUseCaseInput,
  ): Promise<AuthenticateUseCaseOutput> {
    const userOrNull = await this.userRepository.findByEmail(input.email)
    if (!userOrNull) return left(new InvalidCredentialsError())
    if (!userOrNull.checkPassword(input.password))
      throw new InvalidCredentialsError()
    return right({ token: this.token(userOrNull) })
  }

  private token(anUser: User) {
    return this.authToken.sign(
      {
        sub: {
          id: anUser.email,
        },
      },
      env.PRIVATE_KEY,
    )
  }
}
