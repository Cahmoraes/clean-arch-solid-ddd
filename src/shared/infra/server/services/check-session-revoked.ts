import type { FastifyReply, FastifyRequest } from 'fastify'

import type { SessionDAO } from '@/session/application/dao/session-dao'

import { ResponseFactory } from '../../controller/factory/response-factory'
import { container } from '../../ioc/container'
import { TYPES } from '../../ioc/types'
import { HTTP_STATUS } from '../http-status'

export interface CheckSessionRevokedHandlerConstructor {
  request: FastifyRequest
  reply: FastifyReply
}

export interface CheckSessionRevokedHandlerExecute {
  jwi: string
}

export class CheckSessionRevokedHandler {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly sessionDAO: SessionDAO

  constructor(props: CheckSessionRevokedHandlerConstructor) {
    this.request = props.request
    this.reply = props.reply
    this.sessionDAO = container.get<SessionDAO>(TYPES.DAO.Session)
  }

  public async execute(
    input: CheckSessionRevokedHandlerExecute,
  ): Promise<void> {
    const sessionFound = await this.sessionDAO.sessionById(input.jwi)
    if (!sessionFound) return
    this.reply.status(HTTP_STATUS.FORBIDDEN).send(
      ResponseFactory.FORBIDDEN({
        message: 'Você precisa fazer o Logging',
      }),
    )
  }
}
