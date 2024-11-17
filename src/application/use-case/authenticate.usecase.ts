import { inject, injectable } from 'inversify'

import type { AuthToken } from '@/application/interfaces/auth-token'
import type { User } from '@/domain/user'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'

import { type Either, left, right } from '../../domain/value-object/either'
import { InvalidCredentialsError } from '../error/invalid-credentials-error'
import type { UserRepository } from '../repository/user-repository'

export interface AuthenticateUseCaseInput {
  email: string
  password: string
}

export interface AuthTokenOutputDTO {
  token: string
  refreshToken: string
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
    return right({
      token: this.signUserToken(userOrNull),
      refreshToken: this.createRefreshToken(userOrNull),
    })
  }

  private signUserToken(user: User): string {
    return this.authToken.sign(
      {
        sub: {
          id: user.id!,
          email: user.email,
        },
      },
      env.PRIVATE_KEY,
    )
  }

  private createRefreshToken(user: User): string {
    return this.authToken.refreshToken(
      {
        sub: {
          id: user.id!,
          email: user.email,
        },
      },
      env.PRIVATE_KEY,
    )
  }
}
