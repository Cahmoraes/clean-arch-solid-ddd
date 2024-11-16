import type { Either } from '@/domain/value-object/either'
import type { InvalidUserTokenError } from '@/infra/error/invalid-user-token-error'

export type Payload = string | Buffer | object

export interface AuthToken {
  sign(payload: Payload, privateKey: string): string
  verify<TokenPayload>(
    token: unknown,
    publicKey: string,
  ): Either<InvalidUserTokenError, TokenPayload>
}
