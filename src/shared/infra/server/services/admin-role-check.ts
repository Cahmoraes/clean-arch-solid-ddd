import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import type { Logger } from '@/shared/infra/logger/logger'
import { type RoleTypes, RoleValues } from '@/user/domain/value-object/role'

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
    this.logger = container.get<Logger>(TYPES.Logger)
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
