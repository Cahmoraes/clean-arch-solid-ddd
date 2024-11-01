import { injectable } from 'inversify'
import jwt from 'jsonwebtoken'

import type { AuthToken, Payload } from './auth-token'

@injectable()
export class JsonWebTokenAdapter implements AuthToken {
  public sign(payload: Payload, privateKey: string): string {
    return jwt.sign(payload, privateKey)
  }
}
