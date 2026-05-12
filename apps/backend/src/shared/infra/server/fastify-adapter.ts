import { Readable } from "node:stream"
import fastifyCors from "@fastify/cors"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUI from "@fastify/swagger-ui"
import fastify, {
	type FastifyBaseLogger,
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
	type onRequestAsyncHookHandler,
	type preHandlerAsyncHookHandler,
	type RawServerDefault,
	type RouteHandler,
} from "fastify"
import { inject, injectable } from "inversify"
import type { z } from "zod"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { Logger as LoggerDecorate } from "../decorator/logger.js"
import { env } from "../env"
import { SHARED_TYPES } from "../ioc/types.js"
import type { Logger } from "../logger/logger.js"
import type { Queue } from "../queue/queue.js"
import { FastifySwaggerSetupFactory } from "./factories/fastify-swagger-setup-factory.js"
import { FastifySwaggerUISetupFactory } from "./factories/fastify-swagger-ui-setup-factory.js"
import { GlobalErrorHandler } from "./global-error-handler.js"
import { ResponseValidationHook } from "./hooks/response-validation-hook.js"
import type {
	HandlerOptions,
	HttpServer,
	METHOD,
	Schema,
	ZodValidationSchemas,
} from "./http-server.js"
import { RATE_LIMIT_CONFIG } from "./plugins/rate-limit-config.js"
import { RateLimitPlugin } from "./plugins/rate-limit-plugin.js"
import { AdminRoleCheck } from "./services/admin-role-check.js"
import { AuthenticateHandler } from "./services/authenticate-pre-handler.js"
import { CheckSessionRevokedHandler } from "./services/check-session-revoked.js"

@injectable()
export class FastifyAdapter implements HttpServer {
	private readonly _server: FastifyInstance

	constructor(
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
		@inject(SHARED_TYPES.PinoLogger)
		private readonly pinoLogger: FastifyBaseLogger,
	) {
		this._server = fastify({
			loggerInstance: this.pinoLogger,
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
		await this.setupRateLimit()
	}

	private async setupRateLimit(): Promise<void> {
		await RateLimitPlugin.register(this._server, this.logger, this.queue)
	}

	private async setupCORS(): Promise<void> {
		const allowedOrigins = (env.CORS_ORIGINS ?? "")
			.split(",")
			.map((origin: string) => origin.trim())
			.filter(Boolean)
		await this._server.register(fastifyCors, {
			origin: (origin, callback) => {
				if (!origin || allowedOrigins.includes(origin)) {
					return callback(null, true)
				}
				callback(new Error("Not allowed by CORS"), false)
			},
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
			const { fastifySchema, zodValidation } =
				FastifyAdapter.splitSchema(schema)
			this._server[method](
				path,
				{
					schema: fastifySchema,
					validatorCompiler:
						FastifyAdapter.makeValidatorCompiler(zodValidation),
					onRequest: this.authenticateOnRequestOrUndefined(
						handlerOptions.isProtected,
					),
					preHandler: [
						this.onlyAdminPreHandler(handlerOptions.onlyAdmin),
						this.checkSessionRevoked(handlerOptions.isProtected),
					],
					config: {
						rateLimit: this.resolveRateLimitConfig(handlerOptions.rateLimit),
					},
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

	private static splitSchema(schema?: Schema): {
		fastifySchema: object | undefined
		zodValidation?: ZodValidationSchemas
	} {
		if (!schema) return { fastifySchema: undefined }
		const { zodValidation, ...fastifySchema } = schema
		return { fastifySchema, zodValidation }
	}

	private static makeValidatorCompiler(zodValidation?: ZodValidationSchemas) {
		return ({ httpPart }: { httpPart?: string }) => {
			const zodSchema = FastifyAdapter.pickZodSchema(zodValidation, httpPart)
			if (zodSchema) {
				return (data: unknown) => {
					const result = zodSchema.safeParse(data)
					if (result.success) return { value: result.data }
					return { error: result.error }
				}
			}
			return () => ({ value: true })
		}
	}

	private static pickZodSchema(
		zodValidation: ZodValidationSchemas | undefined,
		httpPart: string | undefined,
	): z.ZodType | undefined {
		if (!zodValidation || !httpPart) return undefined
		if (!FastifyAdapter.isZodValidationKey(httpPart)) return undefined
		return zodValidation[httpPart]
	}

	private static isZodValidationKey(
		key: string,
	): key is keyof ZodValidationSchemas {
		return (
			key === "body" ||
			key === "querystring" ||
			key === "params" ||
			key === "headers"
		)
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

	private resolveRateLimitConfig(
		rateLimit: HandlerOptions["rateLimit"],
	): object | false | undefined {
		if (rateLimit === false) return false
		if (!rateLimit) return undefined
		const baseMax = rateLimit.max
		if (typeof baseMax === "number") {
			return {
				...rateLimit,
				max: FastifyAdapter.createAdminAwareMaxFunction(baseMax),
			}
		}
		return rateLimit
	}

	private static createAdminAwareMaxFunction(
		baseMax: number,
	): (request: FastifyRequest) => number {
		return (request: FastifyRequest): number => {
			try {
				if (request.user?.sub?.role === "ADMIN") {
					return baseMax * RATE_LIMIT_CONFIG.ADMIN_MULTIPLIER
				}
			} catch {
				// request.user may not exist for unauthenticated routes
			}
			return baseMax
		}
	}

	public async close(): Promise<void> {
		await RateLimitPlugin.disconnect()
		this._server.server.closeAllConnections?.()
		await this._server.close()
	}
}
