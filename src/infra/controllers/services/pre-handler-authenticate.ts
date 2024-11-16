import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import type { AuthToken } from '@/application/interfaces/auth-token'
import { env } from '@/infra/env'
import { HTTP_STATUS } from '@/infra/server/http-status'

export interface PreHandlerAuthenticateProps {
  request: FastifyRequest
  reply: FastifyReply
  done: HookHandlerDoneFunction
  authToken: AuthToken
}

export class PreHandlerAuthenticate {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly done: HookHandlerDoneFunction
  private readonly authToken: AuthToken

  constructor(props: PreHandlerAuthenticateProps) {
    this.request = props.request
    this.reply = props.reply
    this.done = props.done
    this.authToken = props.authToken
  }

  public async execute() {
    if (!this.hasToken) {
      this.reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        message: 'Unauthorized',
      })
      return this.done()
    }
    console.log(this.token)
    const verifiedOrError = this.authToken.verify(this.token, env.PRIVATE_KEY)
    if (verifiedOrError.isLeft()) {
      this.reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        message: 'Unauthorized',
      })
      return this.done()
    }
    console.log(verifiedOrError.value)
    this.done()
  }

  private get hasToken(): boolean {
    return !!this.request.headers.authorization
  }

  private get token() {
    return this.request.headers.authorization!.split(' ')[1]
  }
}
