import type { FastifyReply, FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase.js"
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
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import { SessionRoutes } from "./routes/session-routes.js"

const authenticateWithGoogleRequestSchema = z.object({
	idToken: z.string().min(1).meta({
		description: "Google ID token",
		example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
	}),
})

export class AuthenticateWithGoogleController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
		private readonly authenticateWithGoogleUseCase: AuthenticateWithGoogleUseCase,
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
			SessionRoutes.AUTHENTICATE_GOOGLE,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeAuthenticateWithGoogleSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error)) {
			return undefined
		}

		if (error.name === "InvalidGoogleTokenError") {
			return ResponseFactory.UNAUTHORIZED({
				message: "Invalid Google token",
			})
		}

		if (error.name === "GoogleEmailNotVerifiedError") {
			return ResponseFactory.UNPROCESSABLE_ENTITY({
				message: "Google email is not verified",
			})
		}

		if (error.name === "ExternalProviderLinkRequiredError") {
			return ResponseFactory.CONFLICT({
				code: "external_account_link_required",
				message:
					"Link this external account from an authenticated session first",
			})
		}

		if (error.name === "GoogleAccountAlreadyLinkedError") {
			return ResponseFactory.CONFLICT({
				message: "This email is already linked to a different Google account",
			})
		}

		return undefined
	}

	private async callback(req: FastifyRequest, res: FastifyReply) {
		const parsedBodyResult = this.parseRequest(
			authenticateWithGoogleRequestSchema,
			req.body,
		)
		if (parsedBodyResult.isFailure()) {
			return this.createResponseError(parsedBodyResult)
		}

		const result = await this.authenticateWithGoogleUseCase.execute({
			idToken: parsedBodyResult.value.idToken,
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

function makeAuthenticateWithGoogleSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["sessions"],
		summary: "Authenticate user with Google",
		description:
			"Authenticate with a Google ID token to obtain JWT token and refresh token cookie",
		body: authenticateWithGoogleRequestSchema,
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
				description: "Invalid Google token",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			422: {
				description: "Google email is not verified",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			409: {
				description: "Authentication conflict for Google external account",
				schema: z.object({
					code: z.string().optional().meta({
						description: "Machine-readable conflict code",
						example: "external_account_link_required",
					}),
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
