import type { InvalidUserTokenError } from '@/application/user/error/invalid-user-token-error'
import type { Either } from '@/domain/shared/value-object/either'

export type Payload = string | Buffer | object

export interface AuthToken {
  sign(payload: Payload, privateKey: string): string
  verify<TokenPayload>(
    token: unknown,
    secretKey: string,
  ): Either<InvalidUserTokenError, TokenPayload>
  refreshToken(payload: Payload, privateKey: string): string
}
