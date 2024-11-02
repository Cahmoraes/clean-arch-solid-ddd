import fastify, {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'

import { env } from '../env'
import { GlobalErrorHandler } from './global-error-handler'
import type { HandleCallback, HttpServer, METHOD } from './http-server'

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
    callback: HandleCallback,
  ): Promise<void> {
    this._server[method](
      path,
      async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await callback(request, reply)
        reply.status(result.status).send(result.body)
      },
    )
  }

  get server() {
    return this._server.server
  }

  public async ready() {
    return this._server.ready()
  }

  async close(): Promise<void> {
    await this._server.close()
  }
}
