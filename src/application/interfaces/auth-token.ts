import type { InvalidUserTokenError } from '@/application/error/invalid-user-token-error'
import type { Either } from '@/domain/value-object/either'

export type Payload = string | Buffer | object

export interface AuthToken {
  sign(payload: Payload, privateKey: string): string
  verify<TokenPayload>(
    token: unknown,
    publicKey: string,
  ): Either<InvalidUserTokenError, TokenPayload>
}
