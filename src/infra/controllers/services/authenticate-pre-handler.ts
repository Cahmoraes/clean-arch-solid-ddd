import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import type { AuthToken } from '@/application/interfaces/auth-token'
import { env } from '@/infra/env'
import { HTTP_STATUS } from '@/infra/server/http-status'

export interface AuthenticatePreHandlerProps {
  request: FastifyRequest
  reply: FastifyReply
  done: HookHandlerDoneFunction
  authToken: AuthToken
}

export interface TokenPayload {
  sub: {
    id: string
    email: string
  }
  iat: number
}

export class AuthenticatePreHandler {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly done: HookHandlerDoneFunction
  private readonly authToken: AuthToken

  constructor(props: AuthenticatePreHandlerProps) {
    this.request = props.request
    this.reply = props.reply
    this.done = props.done
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
    if (verifiedOrError.isLeft()) {
      return this.reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        message: 'Unauthorized',
      })
    }
    this.attachUserToRequest(verifiedOrError.value)
    this.done()
  }

  private get hasToken(): boolean {
    return !!this.request.headers.authorization
  }

  private get token() {
    return this.request.headers.authorization!.split(' ')[1]
  }

  private attachUserToRequest(user: TokenPayload) {
    this.request.user = user
  }
}
