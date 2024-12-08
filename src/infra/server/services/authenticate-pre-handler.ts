import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AuthToken } from '@/application/interfaces/auth-token'
import type { RoleTypes } from '@/domain/value-object/role'
import { env } from '@/infra/env'
import { HTTP_STATUS } from '@/infra/server/http-status'

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
  }
  iat: number
  exp: number
}

export class AuthenticateHandler {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly authToken: AuthToken

  constructor(props: AuthenticateHandlerProps) {
    this.request = props.request
    this.reply = props.reply
    this.authToken = props.authToken
  }

  public async execute(): Promise<void> {
    if (!this.hasToken) {
      return this.reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        message: 'Unauthorized',
      })
    }
    const verifiedOrError = this.authToken.verify<TokenPayload>(
      this.token,
      env.PRIVATE_KEY,
    )
    if (verifiedOrError.isFailure()) {
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

  private attachUserToRequest(user: TokenPayload): void {
    this.request.user = user
  }
}
