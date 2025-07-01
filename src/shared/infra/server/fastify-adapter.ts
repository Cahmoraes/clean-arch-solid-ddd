import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'
import fastify, {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type RouteHandler,
} from 'fastify'
import { inject, injectable } from 'inversify'

import type { SessionDAO } from '@/session/application/dao/session-dao'
import type { AuthToken } from '@/user/application/auth/auth-token'

import { Logger as LoggerDecorate } from '../decorator/logger'
import { env } from '../env'
import { AUTH_TYPES, SHARED_TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import { FastifySwaggerSetupFactory } from './factories/fastify-swagger-setup-factory'
import { FastifySwaggerUISetupFactory } from './factories/fastify-swagger-ui-setup-factory'
import { GlobalErrorHandler } from './global-error-handler'
import type { HandlerOptions, HttpServer, METHOD, Schema } from './http-server'
import { AdminRoleCheck } from './services/admin-role-check'
import { AuthenticateHandler } from './services/authenticate-pre-handler'
import { CheckSessionRevokedHandler } from './services/check-session-revoked'

@injectable()
export class FastifyAdapter implements HttpServer {
  private readonly _server: FastifyInstance

  constructor(
    @inject(AUTH_TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
    @inject(AUTH_TYPES.DAO.Session)
    private readonly sessionDAO: SessionDAO,
  ) {
    this._server = fastify({})
    this.bindMethods()
    this.initialize()
  }

  private async initialize(): Promise<void> {
    this.setupErrorHandler()
    await this.setupCORS()
    await this.setupSwagger()
  }

  private async setupCORS(): Promise<void> {
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
    handlerOptions: HandlerOptions,
    schema?: Schema,
  ): Promise<void> {
    try {
      this._server[method](
        path,
        {
          schema,
          onRequest: this.authenticateOnRequestOrUndefined(
            handlerOptions.isProtected,
          ),
          preHandler: [
            this.onlyAdminPreHandler(handlerOptions.onlyAdmin),
            this.checkSessionRevoked(handlerOptions.isProtected),
          ],
        },
        this.routeHandler(handlerOptions),
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

  private authenticateOnRequestOrUndefined(
    enableAuthenticate?: boolean,
  ): RouteHandler | undefined {
    return enableAuthenticate ? this.authenticateOnRequest : undefined
  }

  private onlyAdminPreHandler(onlyAdmin?: boolean): RouteHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!onlyAdmin) return
      const role = request.user.sub.role
      const adminRoleCheck = new AdminRoleCheck({ request, reply })
      return adminRoleCheck.execute(role)
    }
  }

  private checkSessionRevoked(isProtected?: boolean): RouteHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isProtected) return
      const checkSessionRevoked = new CheckSessionRevokedHandler({
        reply,
        request,
      })
      await checkSessionRevoked.execute({
        jwi: request.user.sub.jwi,
      })
    }
  }

  private routeHandler(handlers: HandlerOptions): RouteHandler {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> => {
      const result = await handlers.callback(request, reply)
      reply.status(result.status).send(result.body)
    }
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
