import fastify, {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'

import { env } from '../env'
import { GlobalErrorHandler } from './global-error-handler'
import type { HandleCallback, HttpServer, METHOD } from './http-server'

export class FastifyAdapter implements HttpServer {
  private readonly server: FastifyInstance

  constructor() {
    this.server = fastify({})
  }

  public async initialize(): Promise<void> {
    this.server.setErrorHandler(GlobalErrorHandler.handle)
    await this.listen()
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
