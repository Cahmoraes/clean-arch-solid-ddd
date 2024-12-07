import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { fromError } from 'zod-validation-error'

import { UserAlreadyExistsError } from '@/application/error/user-already-exists-error'

import { HTTP_STATUS } from './http-status'

export class GlobalErrorHandler {
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
    reply
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send({ message: 'Internal Server Error' })
  }
}
