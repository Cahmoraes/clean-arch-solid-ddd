import fastify, {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import { injectable } from 'inversify'

import { env } from '../env'
import { GlobalErrorHandler } from './global-error-handler'
import type { Handlers, HttpServer, METHOD } from './http-server'

@injectable()
export class FastifyAdapter implements HttpServer {
  private readonly _server: FastifyInstance

  constructor() {
    this._server = fastify({})
  }

  public async initialize(): Promise<void> {
    this._server.setErrorHandler(GlobalErrorHandler.handle)
    await this.listen()
  }

  public async listen(): Promise<void> {
    try {
      await this._server.listen({
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
    handlers: Handlers,
  ): Promise<void> {
    this._server[method](
      path,
      {
        preHandler: handlers.preHandler,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await handlers.callback(request, reply)
        reply.status(result.status).send(result.body)
      },
    )
  }

  get server() {
    return this._server.server
  }

  get fastifyInstance() {
    return this._server
  }

  public async ready() {
    return this._server.ready()
  }

  async close(): Promise<void> {
    await this._server.close()
  }
}
