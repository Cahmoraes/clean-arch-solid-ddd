import { injectable } from 'inversify'
import jwt from 'jsonwebtoken'

import { type Either, left, right } from '@/domain/value-object/either'

import type {
  AuthToken,
  Payload,
} from '../../application/interfaces/auth-token'
import { InvalidUserTokenError } from '../error/invalid-user-token-error'

@injectable()
export class JsonWebTokenAdapter implements AuthToken {
  public sign(payload: Payload, privateKey: string): string {
    return jwt.sign(payload, privateKey)
  }

  public verify(
    token: string,
    publicKey: string,
  ): Either<InvalidUserTokenError, Payload> {
    try {
      const payload = jwt.verify(token, publicKey)
      return right(payload)
    } catch {
      return left(new InvalidUserTokenError())
    }
  }
}
