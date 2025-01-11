import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { fromError } from 'zod-validation-error'

import { UserAlreadyExistsError } from '@/application/error/user-already-exists-error'

import { container } from '../ioc/container'
import { TYPES } from '../ioc/types'
import { EXCHANGES } from '../queue/exchanges'
import type { Queue } from '../queue/queue'
import { HTTP_STATUS } from './http-status'

export class GlobalErrorHandler {
  private static _queue?: Queue

  public static handle(
    error: FastifyError,
    _: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (error instanceof UserAlreadyExistsError) {
      return reply.status(HTTP_STATUS.CONFLICT).send({ message: error.message })
    }
    if (error instanceof ZodError) {
      const validationError = fromError(error)
      return reply
        .status(HTTP_STATUS.BAD_REQUEST)
        .send({ message: validationError.toString() })
    }
    console.log(error)
    console.log(`***********************`)
    console.log(this)
    GlobalErrorHandler.publish(error)
    reply
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send({ message: 'Internal Server Error' })
  }

  private static queue(): Queue {
    if (!GlobalErrorHandler._queue) {
      GlobalErrorHandler._queue = container.get<Queue>(TYPES.Queue)
    }
    return GlobalErrorHandler._queue
  }

  private static publish(error: FastifyError): void {
    const queue = GlobalErrorHandler.queue()
    queue.publish(EXCHANGES.LOG, {
      message: error.message,
    })
  }
}
