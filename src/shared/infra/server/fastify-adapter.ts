import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'
import fastify, {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type HookHandlerDoneFunction,
} from 'fastify'
import { inject, injectable } from 'inversify'

import type { AuthToken } from '@/user/application/auth/auth-token'

import { Logger as LoggerDecorate } from '../decorator/logger'
import { env } from '../env'
import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import { FastifySwaggerSetupFactory } from './factories/fastify-swagger-setup-factory'
import { FastifySwaggerUISetupFactory } from './factories/fastify-swagger-ui-setup-factory'
import { GlobalErrorHandler } from './global-error-handler'
import type { HandlerOptions, HttpServer, METHOD, Schema } from './http-server'
import { AdminRoleCheck } from './services/admin-role-check'
import { AuthenticateHandler } from './services/authenticate-pre-handler'

@injectable()
export class FastifyAdapter implements HttpServer {
  private readonly _server: FastifyInstance

  constructor(
    @inject(TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {
    this._server = fastify({})
    this.bindMethods()
    this.initialize()
  }

  private async initialize(): Promise<void> {
    this.setupErrorHandler()
    // await this.setupCORS()
    // await this.setupSwagger()
  }

  private async setupCORS() {
    await this._server.register(fastifyCors)
  }

  private async setupSwagger() {
    await this._server.register(
      fastifySwagger,
      FastifySwaggerSetupFactory.create(),
    )
    await this._server.register(
      fastifySwaggerUI,
      FastifySwaggerUISetupFactory.create(),
    )
  }

  private setupErrorHandler() {
    this._server.setErrorHandler(GlobalErrorHandler.handle)
  }

  private bindMethods() {
    this.authenticateOnRequest = this.authenticateOnRequest.bind(this)
  }

  @LoggerDecorate({
    type: 'info',
    message: `HTTP Server running 🚀 http://${env.HOST}:${env.PORT}`,
  })
  public async listen(): Promise<void> {
    await this.ready()
    await this._server.listen({
      port: env.PORT,
      host: env.HOST,
    })
  }

  public async register(
    method: METHOD,
    path: string,
    handlers: HandlerOptions,
    schema?: Schema,
  ): Promise<void> {
    try {
      this._server[method](
        path,
        {
          schema,
          onRequest: this.authenticateOnRequestOrUndefined(
            handlers.isProtected,
          ),
          preHandler: this.onRequestPreHandlerOrUndefined(handlers.onlyAdmin),
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const result = await handlers.callback(request, reply)
          reply.status(result.status).send(result.body)
        },
      )
      this.logger.info(
        this,
        `Route registered: ${method.toUpperCase()} ${path}`,
      )
    } catch (error) {
      this.logger.error(
        this,
        `Error registering route: ${method.toUpperCase()} ${path}`,
      )
      this.logger.error(this, error as object)
    }
  }

  private authenticateOnRequestOrUndefined(enableAuthenticate?: boolean) {
    return enableAuthenticate ? this.authenticateOnRequest : undefined
  }

  private async authenticateOnRequest(
    request: any,
    reply: FastifyReply,
  ): Promise<void> {
    const authenticateHandler = new AuthenticateHandler({
      request,
      reply,
      authToken: this.authToken,
    })
    await authenticateHandler.execute()
  }

  private onRequestPreHandlerOrUndefined(enableOnRequest?: boolean) {
    return enableOnRequest ? this.onRequestPreHandler : undefined
  }

  private onRequestPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) {
    const role = request.user.sub.role
    const adminRoleCheck = new AdminRoleCheck({ request, reply, done })
    adminRoleCheck.execute(role)
  }

  get server() {
    return this._server.server
  }

  public async ready(): Promise<undefined> {
    await this._server.ready()
  }

  public async close(): Promise<void> {
    return this._server.close()
  }
}
