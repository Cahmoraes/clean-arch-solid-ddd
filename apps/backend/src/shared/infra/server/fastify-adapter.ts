import { Readable } from "node:stream"
import fastifyCors from "@fastify/cors"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUI from "@fastify/swagger-ui"
import fastify, {
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
	type onRequestAsyncHookHandler,
	type preHandlerAsyncHookHandler,
	type RawServerDefault,
	type RouteHandler,
} from "fastify"
import { inject, injectable } from "inversify"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { Logger as LoggerDecorate } from "../decorator/logger"
import { env } from "../env"
import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import { FastifySwaggerSetupFactory } from "./factories/fastify-swagger-setup-factory"
import { FastifySwaggerUISetupFactory } from "./factories/fastify-swagger-ui-setup-factory"
import { GlobalErrorHandler } from "./global-error-handler"
import { ResponseValidationHook } from "./hooks/response-validation-hook.js"
import type { HandlerOptions, HttpServer, METHOD, Schema } from "./http-server"
import { AdminRoleCheck } from "./services/admin-role-check"
import { AuthenticateHandler } from "./services/authenticate-pre-handler"
import { CheckSessionRevokedHandler } from "./services/check-session-revoked"

@injectable()
export class FastifyAdapter implements HttpServer {
	private readonly _server: FastifyInstance

	constructor(
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {
		this._server = fastify({
			ajv: {
				customOptions: {
					keywords: ["example"],
				},
			},
		})
		this.bindMethods()
		this.registerSwaggerEarly()
	}

	private bindMethods(): void {
		this.authenticateOnRequest = this.authenticateOnRequest.bind(this)
	}

	private registerSwaggerEarly(): void {
		this._server.register(fastifySwagger, FastifySwaggerSetupFactory.create())
		this._server.register(
			fastifySwaggerUI,
			FastifySwaggerUISetupFactory.create(),
		)
	}

	private async initialize(): Promise<void> {
		void this.setupErrorHandler()
		await this.setupCORS()
		this.setupRawBody()
		this.setupResponseValidation()
	}

	private async setupCORS(): Promise<void> {
		await this._server.register(fastifyCors, {
			origin: true,
			credentials: true,
			methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		})
	}

	private setupRawBody(): void {
		this._server.addHook(
			"preParsing",
			async (request: FastifyRequest, _reply: FastifyReply, payload) => {
				const chunks: Buffer[] = []
				for await (const chunk of payload as AsyncIterable<Buffer | string>) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
				}
				const body = Buffer.concat(chunks)
				request.rawBody = body.toString("utf8")
				return Readable.from(body) as NodeJS.ReadableStream
			},
		)
	}

	private setupResponseValidation(): void {
		ResponseValidationHook.register(this._server)
	}

	private setupErrorHandler(): void {
		this._server.setErrorHandler(GlobalErrorHandler.handle)
	}

	@LoggerDecorate({
		type: "info",
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
	): onRequestAsyncHookHandler | undefined {
		return enableAuthenticate ? this.authenticateOnRequest : undefined
	}

	private onlyAdminPreHandler(onlyAdmin?: boolean): preHandlerAsyncHookHandler {
		return async (
			request: FastifyRequest,
			reply: FastifyReply,
		): Promise<void> => {
			if (!onlyAdmin) return
			const role = request.user.sub.role
			const adminRoleCheck = new AdminRoleCheck({ request, reply })
			void adminRoleCheck.execute(role)
		}
	}

	private checkSessionRevoked(
		isProtected?: boolean,
	): preHandlerAsyncHookHandler {
		return async (
			request: FastifyRequest,
			reply: FastifyReply,
		): Promise<void> => {
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

	get server(): RawServerDefault {
		return this._server.server
	}

	private _initialized = false

	public async prepare(): Promise<void> {
		if (this._initialized) return
		this._initialized = true
		await this.initialize()
		await this._server.after()
	}

	public async ready(): Promise<undefined> {
		await this.prepare()
		await this._server.ready()
	}

	public swagger(): unknown {
		return this._server.swagger()
	}

	public async close(): Promise<void> {
		this._server.server.closeAllConnections?.()
		await this._server.close()
	}
}
