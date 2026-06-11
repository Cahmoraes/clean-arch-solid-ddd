import type { FastifyReply, FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { LogoutUseCase } from "@/session/application/use-case/logout.usecase"
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
import { SessionRoutes } from "./routes/session-routes"

export class LogoutController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(AUTH_TYPES.UseCases.Logout)
		private readonly logout: LogoutUseCase,
		@inject(SHARED_TYPES.Cookies.Manager)
		private readonly cookieManager: CookieManager,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅ | 🔒",
	})
	public async init() {
		this.server.register(
			"post",
			SessionRoutes.LOGOUT,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeLogoutSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error)) {
			return undefined
		}

		if (error.name === "TokenAlreadyRevokedError") {
			return ResponseFactory.UNAUTHORIZED({
				message: "Session already revoked",
			})
		}

		return undefined
	}

	private async callback(req: FastifyRequest, res: FastifyReply) {
		const user = req.user
		const result = await this.logout.execute({
			jwi: user.sub.jwi,
			userId: user.sub.id,
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		res.header("set-cookie", this.clearRefreshTokenCookie())

		return ResponseFactory.NO_CONTENT()
	}

	private clearRefreshTokenCookie(): string {
		return this.cookieManager.serialize(env.REFRESH_TOKEN_NAME, "", {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			expires: new Date(0),
		})
	}
}

function makeLogoutSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["sessions"],
		summary: "Logout user",
		description: "Logout user, revoke session and clear refresh token cookie",
		security: true,
		responses: {
			204: { description: "Logout successful" },
			401: {
				description: "Session already revoked or unauthorized",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
