import { inject, injectable } from 'inversify'

import type { AuthToken } from '@/application/interfaces/auth-token'
import type { User } from '@/domain/user'
import { env } from '@/shared/env'
import { TYPES } from '@/shared/ioc/types'

import { type Either, left, right } from '../../domain/value-object/either'
import { InvalidCredentialsError } from '../error/invalid-credentials-error'
import type { UserRepository } from '../repository/user-repository'

export interface AuthenticateUseCaseInput {
  email: string
  password: string
}

export interface AuthTokenOutputDTO {
  token: string
}

export type AuthenticateUseCaseOutput = Either<
  InvalidCredentialsError,
  AuthTokenOutputDTO
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
    if (!userOrNull) {
      return left(new InvalidCredentialsError())
    }
    if (!userOrNull.checkPassword(input.password)) {
      return left(new InvalidCredentialsError())
    }
    return right({ token: this.signUserToken(userOrNull) })
  }

  private signUserToken(anUser: User): string {
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
