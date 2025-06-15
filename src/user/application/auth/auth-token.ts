import type { Either } from '@/shared/domain/value-object/either'
import type { InvalidUserTokenError } from '@/user/application/error/invalid-user-token-error'

export type Payload = string | Buffer | object

export interface AuthToken {
  sign(payload: Payload, privateKey: string): string
  verify<TokenPayload>(
    token: unknown,
    secretKey: string,
  ): Either<InvalidUserTokenError, TokenPayload>
  refreshToken(payload: Payload, privateKey: string): string
}
