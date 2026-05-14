import type { FastifyReply, FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import type { CookieManager } from "@/shared/infra/cookie/cookie-manager"
import { Logger } from "@/shared/infra/decorator/logger"
import { env } from "@/shared/infra/env"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config"
import { SessionRoutes } from "./routes/session-routes"

const authenticateRequestSchema = z.object({
	email: z
		.string()
		.email()
		.meta({ description: "User email address", example: "john@example.com" }),
	password: z
		.string()
		.min(8)
		.max(128)
		.meta({ description: "User password", example: "secret123" }),
})

export class AuthenticateController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(AUTH_TYPES.UseCases.Authenticate)
		private readonly authenticateUseCase: AuthenticateUseCase,
		@inject(SHARED_TYPES.Cookies.Manager)
		private readonly cookieManager: CookieManager,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.server.register(
			"post",
			SessionRoutes.AUTHENTICATE,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeAuthenticateSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error)) {
			return undefined
		}

		if (error.name === "InvalidCredentialsError") {
			return ResponseFactory.UNAUTHORIZED({
				message: "Invalid credentials",
			})
		}

		if (error.name === "PasswordNotSetError") {
			return ResponseFactory.UNAUTHORIZED({
				code: "password_not_set",
				message: "Password not set for this account",
			})
		}

		return undefined
	}

	private async callback(req: FastifyRequest, res: FastifyReply) {
		const parsedBodyResult = this.parseRequest(
			authenticateRequestSchema,
			req.body,
		)
		if (parsedBodyResult.isFailure()) {
			return this.createResponseError(parsedBodyResult)
		}

		const result = await this.authenticateUseCase.execute({
			email: parsedBodyResult.value.email,
			password: parsedBodyResult.value.password,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		res.header(
			"set-cookie",
			this.encodeRefreshTokenCookie(result.value.refreshToken),
		)
		return ResponseFactory.OK({
			body: result.value,
		})
	}

	private encodeRefreshTokenCookie(aString: string): string {
		return this.cookieManager.serialize(env.REFRESH_TOKEN_NAME, aString, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
		})
	}
}

function makeAuthenticateSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["sessions"],
		summary: "Authenticate user",
		description:
			"Authenticate with email and password to obtain JWT token and refresh token cookie",
		body: authenticateRequestSchema,
		responses: {
			200: {
				description: "Authentication successful",
				schema: z.object({
					token: z
						.string()
						.meta({ description: "JWT access token", example: "eyJhbG..." }),
					refreshToken: z
						.string()
						.meta({ description: "Refresh token", example: "eyJhbG..." }),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			401: {
				description: "Authentication error",
				schema: z.object({
					code: z.string().optional().meta({ description: "Error code" }),
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
