import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { env } from '@/shared/infra/env'
import { TYPES } from '@/shared/infra/ioc/types'
import type { AuthToken } from '@/user/application/auth/auth-token'
import type { User } from '@/user/domain/user'

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
    const userOrNull = await this.userRepository.userOfEmail(input.email)
    if (!userOrNull) {
      return failure(new InvalidCredentialsError())
    }
    if (!userOrNull.checkPassword(input.password)) {
      return failure(new InvalidCredentialsError())
    }
    return success({
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
          role: user.role,
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
          role: user.role,
        },
      },
      env.PRIVATE_KEY,
    )
  }
}
