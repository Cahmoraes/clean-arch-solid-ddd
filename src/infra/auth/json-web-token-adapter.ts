import { injectable } from 'inversify'
import jwt from 'jsonwebtoken'

import type {
  AuthToken,
  Payload,
} from '../../application/interfaces/auth-token'

@injectable()
export class JsonWebTokenAdapter implements AuthToken {
  public sign(payload: Payload, privateKey: string): string {
    return jwt.sign(payload, privateKey)
  }
}
