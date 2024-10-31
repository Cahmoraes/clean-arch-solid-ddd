import fastify, {
  type FastifyError,
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import { ZodError } from 'zod'
import { fromError } from 'zod-validation-error'

import { UserAlreadyExistsError } from '@/application/error/user-already-exists-error'

import { env } from '../env'
import type { HandleCallback, HttpServer, METHOD } from './http-server'
import { HTTP_STATUS } from './http-status'

export class FastifyAdapter implements HttpServer {
  private readonly server: FastifyInstance

  constructor() {
    this.server = fastify({})
  }

  public async initialize(): Promise<void> {
    this.server.setErrorHandler(this.globalErrorHandler)
    await this.listen()
  }

  private async globalErrorHandler(
    error: FastifyError,
    _: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (error instanceof UserAlreadyExistsError) {
      return reply.status(HTTP_STATUS.CONFLICT).send({ message: error.message })
    }
    if (error instanceof ZodError) {
      const validationError = fromError(error)
      return reply
        .status(HTTP_STATUS.BAD_REQUEST)
        .send({ message: validationError.toString() })
    }
    reply
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send({ message: 'Internal Server Error' })
  }

  public async listen(): Promise<void> {
    try {
      await this.server.listen({
        port: env.PORT,
        host: env.HOST,
      })
      console.log(`HTTP Server running 🚀 http://${env.HOST}:${env.PORT}`)
    } catch (error) {
      console.error(error)
    }
  }

  async register(
    method: METHOD,
    path: string,
    callback: HandleCallback,
  ): Promise<void> {
    this.server[method](
      path,
      async (request: FastifyRequest, reply: FastifyReply) => {
        await callback(request, reply)
        reply.status(201).send()
      },
    )
  }
}
