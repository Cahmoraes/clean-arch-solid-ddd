import type { FastifyReply, FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import type {
	Cookie,
	CookieManager,
} from "@/shared/infra/cookie/cookie-manager"
import { Logger } from "@/shared/infra/decorator/logger"
import { env } from "@/shared/infra/env"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger as DebugLogger } from "@/shared/infra/logger/logger"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { SessionRoutes } from "./routes/session-routes"

interface Sub {
	sub: {
		id: string
		email: string
		role: string
		jwi: string
	}
	iat: number
}

const refreshTokenRequestSchema = z.object({
	cookie: z.string(),
})

export class RefreshTokenController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(SHARED_TYPES.Cookies.Manager)
		private readonly cookieManager: CookieManager,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: DebugLogger,
		@inject(AUTH_TYPES.DAO.RevokedToken)
		private readonly revokedTokenDAO: RevokedTokenDAO,
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
			"patch",
			SessionRoutes.REFRESH,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeRefreshTokenSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest, res: FastifyReply) {
		const cookieOrError = this.parseRequest(
			refreshTokenRequestSchema,
			req.headers,
		)
		if (cookieOrError.isFailure()) {
			return this.createResponseError(cookieOrError)
		}

		const cookie = this.cookieParse(cookieOrError.value.cookie)
		if (!cookie) {
			return ResponseFactory.create({
				status: HTTP_STATUS.BAD_REQUEST,
				message: `Missing ${env.REFRESH_TOKEN_NAME} cookie`,
			})
		}

		const verified = this.authToken.verify<Sub>(cookie.value, env.PRIVATE_KEY)
		if (verified.isFailure()) {
			this.warnOnRefreshTokenFailure(cookie, verified.value.message)
			return ResponseFactory.create({
				status: HTTP_STATUS.FORBIDDEN,
				message: verified.value.message,
			})
		}

		const { sub, iat } = verified.value
		const revokedAfter = await this.revokedTokenDAO.revokedAfterForUser(sub.id)
		if (revokedAfter !== null && iat <= revokedAfter) {
			return ResponseFactory.create({
				status: HTTP_STATUS.UNAUTHORIZED,
				message: "Session already revoked",
			})
		}

		const { token, refreshToken } = this.createTokens(sub)
		res.header("set-cookie", this.encodeRefreshTokenCookie(refreshToken))
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			message: token,
		})
	}

	private cookieParse(cookie: string): Cookie | null {
		const parsedCookie =
			this.cookieManager.parse(cookie)[env.REFRESH_TOKEN_NAME]
		return parsedCookie ?? null
	}

	private warnOnRefreshTokenFailure(cookie: Cookie, message: string) {
		this.logger.warn(this, {
			cookie: cookie,
			message,
		})
	}

	private createTokens(sub: object) {
		const token = this.authToken.sign({ sub }, env.PRIVATE_KEY)
		const refreshToken = this.authToken.refreshToken({ sub }, env.PRIVATE_KEY)
		return { token, refreshToken }
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

function makeRefreshTokenSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["sessions"],
		summary: "Refresh access token",
		description:
			"Use the refresh token cookie to obtain a new access token and rotate the refresh token",
		responses: {
			200: {
				description: "Token refreshed successfully",
				schema: z.object({
					message: z.string().meta({
						description: "New JWT access token",
						example: "eyJhbG...",
					}),
				}),
			},
			400: {
				description: "Missing cookie header",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			403: {
				description: "Invalid or expired refresh token",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
