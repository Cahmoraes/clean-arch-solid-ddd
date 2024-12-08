import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import { type RoleTypes, RoleValues } from '@/domain/value-object/role'
import type { Logger } from '@/infra/logger/logger'
import { WinstonAdapter } from '@/infra/logger/winston-adapter'

import { HTTP_STATUS } from '../http-status'

export interface AdminRoleCheckConstructor {
  request: FastifyRequest
  reply: FastifyReply
  done: HookHandlerDoneFunction
}

export class AdminRoleCheck {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly done: HookHandlerDoneFunction
  private readonly logger: Logger

  constructor(props: AdminRoleCheckConstructor) {
    this.request = props.request
    this.reply = props.reply
    this.done = props.done
    this.logger = new WinstonAdapter()
  }

  public execute(role: RoleTypes) {
    if (role !== RoleValues.ADMIN) {
      this.logWhenRoleIsNotAdmin()
      return this.reply
        .status(HTTP_STATUS.FORBIDDEN)
        .send({ message: 'Forbidden' })
    }
    this.done()
  }

  private logWhenRoleIsNotAdmin() {
    this.logger.warn(this, {
      message: 'User is not an admin',
      route: this.request.url,
      role: this.request.user.sub.role,
    })
  }
}