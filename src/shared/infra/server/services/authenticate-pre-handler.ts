import type { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '@/shared/infra/env'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES } from '@/shared/infra/ioc/types'
import type { Logger } from '@/shared/infra/logger/logger'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'
import type { AuthToken } from '@/user/application/auth/auth-token'
import type { RoleTypes } from '@/user/domain/value-object/role'

export interface AuthenticateHandlerProps {
  request: FastifyRequest
  reply: FastifyReply
  authToken: AuthToken
}

export interface TokenPayload {
  sub: {
    id: string
    email: string
    role: RoleTypes
    jwi: string
  }
  iat: number
  exp: number
}

export class AuthenticateHandler {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly authToken: AuthToken
  private readonly logger: Logger

  constructor(props: AuthenticateHandlerProps) {
    this.request = props.request
    this.reply = props.reply
    this.authToken = props.authToken
    this.logger = container.get<Logger>(SHARED_TYPES.Logger)
  }

  public async execute(): Promise<void> {
    if (!this.hasToken) {
      this.logger.warn(this, 'No token provided')
      return this.reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        message: 'Unauthorized',
      })
    }
    const verifiedOrError = this.authToken.verify<TokenPayload>(
      this.token,
      env.PRIVATE_KEY,
    )
    if (verifiedOrError.isFailure()) {
      this.logOnFailedTokenVerification(verifiedOrError.value)
      return this.reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        message: 'Unauthorized',
      })
    }
    this.attachUserToRequest(verifiedOrError.value)
  }

  private get hasToken(): boolean {
    return !!this.request.headers.authorization
  }

  private get token(): string {
    return this.request.headers.authorization!.split(' ')[1]
  }

  private logOnFailedTokenVerification(invalidTokenError: Error): void {
    this.logger.warn(this, {
      message: 'Token verification failed',
      error: invalidTokenError,
    })
  }

  private attachUserToRequest(user: TokenPayload): void {
    this.request.user = user
  }
}
