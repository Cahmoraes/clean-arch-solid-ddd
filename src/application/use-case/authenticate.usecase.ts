import { inject, injectable } from 'inversify'

import type { User } from '@/domain/user'
import type { AuthToken } from '@/infra/auth/auth-token'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'

import { InvalidCredentialsError } from '../error/invalid-credentials-error'
import type { UserRepository } from '../repository/user-repository'

export interface AuthenticateUseCaseInput {
  email: string
  password: string
}

export type AuthenticateUseCaseOutput = {
  token: string
}

@injectable()
export class AuthenticateUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
    @inject(TYPES.AuthToken)
    private readonly authToken: AuthToken,
  ) {}

  public async execute(
    input: AuthenticateUseCaseInput,
  ): Promise<AuthenticateUseCaseOutput> {
    const existingUser = await this.userRepository.findByEmail(input.email)
    if (!existingUser) throw new InvalidCredentialsError()
    return {
      token: this.token(existingUser),
    }
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
