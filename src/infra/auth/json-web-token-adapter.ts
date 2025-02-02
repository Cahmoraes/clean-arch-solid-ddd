import { injectable } from 'inversify'
import jwt from 'jsonwebtoken'

import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'

import { InvalidUserTokenError } from '../../application/user/error/invalid-user-token-error'
import type { AuthToken, Payload } from '../../application/user/auth/auth-token'
import { env } from '../env'

@injectable()
export class JsonWebTokenAdapter implements AuthToken {
  public sign(payload: Payload, privateKey: string): string {
    return jwt.sign(payload, privateKey, {
      expiresIn: env.JWT_EXPIRES_IN,
    })
  }

  public verify<TokenPayload>(
    token: string,
    secretKey: string,
  ): Either<InvalidUserTokenError, TokenPayload> {
    try {
      const payload = jwt.verify(token, secretKey) as TokenPayload
      return success(payload)
    } catch (e) {
      if (e instanceof Error) {
        console.log(e.message)
      }
      return failure(new InvalidUserTokenError())
    }
  }

  public refreshToken(payload: Payload, secretKey: string): string {
    return jwt.sign(payload, secretKey, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    })
  }
}
