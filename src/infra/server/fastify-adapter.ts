import fastify, {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type HookHandlerDoneFunction,
} from 'fastify'
import { inject, injectable } from 'inversify'

import type { AuthToken } from '@/application/interfaces/auth-token'

import { AuthenticatePreHandler as AuthenticatePreHandler } from '../controllers/services/authenticate-pre-handler'
import { env } from '../env'
import { TYPES } from '../ioc/types'
import { GlobalErrorHandler } from './global-error-handler'
import type { Handlers, HttpServer, METHOD } from './http-server'

@injectable()
export class FastifyAdapter implements HttpServer {
  private readonly _server: FastifyInstance

  constructor(
    @inject(TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
  ) {
    this._server = fastify({})
    this.bindMethods()
  }

  private bindMethods() {
    this.authenticatePreHandler = this.authenticatePreHandler.bind(this)
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
        preHandler: this.createAuthenticatePreHandlerOrUndefined(
          handlers.isProtected,
        ),
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await handlers.callback(request, reply)
        reply.status(result.status).send(result.body)
      },
    )
  }

  private createAuthenticatePreHandlerOrUndefined(
    enableAuthenticate?: boolean,
  ) {
    return enableAuthenticate ? this.authenticatePreHandler : undefined
  }

  private async authenticatePreHandler(
    request: any,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ): Promise<void> {
    const preHandlerAuthenticate = new AuthenticatePreHandler({
      request,
      reply,
      done,
      authToken: this.authToken,
    })
    await preHandlerAuthenticate.execute()
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
