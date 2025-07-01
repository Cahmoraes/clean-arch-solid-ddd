import type { FastifyReply, FastifyRequest } from 'fastify'

import type { SessionDAO } from '@/session/application/dao/session-dao'

import { container } from '../../ioc/container'
import { AUTH_TYPES } from '../../ioc/types'
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
    this.sessionDAO = container.get<SessionDAO>(AUTH_TYPES.DAO.Session)
  }

  public async execute(
    input: CheckSessionRevokedHandlerExecute,
  ): Promise<void> {
    const sessionFound = await this.sessionDAO.sessionById(input.jwi)
    if (!sessionFound) return
    this.reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      message: 'Session already revoked',
    })
  }
}
