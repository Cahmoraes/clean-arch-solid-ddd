import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import { type RoleTypes, RoleValues } from '@/domain/value-object/role'

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

  constructor(props: AdminRoleCheckConstructor) {
    this.request = props.request
    this.reply = props.reply
    this.done = props.done
  }

  public execute(role: RoleTypes) {
    if (role !== RoleValues.ADMIN) {
      return this.reply
        .status(HTTP_STATUS.FORBIDDEN)
        .send({ message: 'Forbidden' })
    }
    this.done()
  }
}
