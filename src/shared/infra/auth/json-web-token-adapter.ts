import { inject, injectable } from 'inversify'
import jwt, { type SignOptions } from 'jsonwebtoken'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'

import type {
  AuthToken,
  Payload,
} from '../../../user/application/auth/auth-token'
import { InvalidUserTokenError } from '../../../user/application/error/invalid-user-token-error'
import { env } from '../env'
import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'

@injectable()
export class JsonWebTokenAdapter implements AuthToken {
  constructor(
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public sign(payload: Payload, privateKey: string): string {
    return jwt.sign(payload, privateKey, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    })
  }

  public verify<TokenPayload>(
    token: string,
    secretKey: string,
  ): Either<InvalidUserTokenError, TokenPayload> {
    try {
      const payload = jwt.verify(token, secretKey) as TokenPayload
      return success(payload)
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(this, error.message)
      }
      return failure(new InvalidUserTokenError())
    }
  }

  public refreshToken(payload: Payload, secretKey: string): string {
    return jwt.sign(payload, secretKey, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    })
  }
}
