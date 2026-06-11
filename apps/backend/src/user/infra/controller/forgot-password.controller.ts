import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { ForgotPasswordUseCase } from "@/user/application/use-case/forgot-password.usecase"
import { UserRoutes } from "./routes/user-routes"

const forgotPasswordRequestSchema = z.object({
	email: z.string().email().meta({
		description: "User email address",
		example: "john@example.com",
	}),
})

const forgotPasswordResponseSchema = z.object({
	message: z.string().meta({
		description: "Generic success message",
		example:
			"Se este e-mail estiver cadastrado, você receberá um link em breve.",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

const GENERIC_SUCCESS_MESSAGE =
	"Se este e-mail estiver cadastrado, você receberá um link em breve."

export class ForgotPasswordController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.ForgotPassword)
		private readonly forgotPassword: ForgotPasswordUseCase,
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
		await this.httpServer.register(
			"post",
			UserRoutes.FORGOT_PASSWORD,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX,
					timeWindow: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.TIME_WINDOW,
				},
			},
			makeForgotPasswordSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(
			forgotPasswordRequestSchema,
			req.body,
		)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		await this.forgotPassword.execute({
			email: parsedBodyOrError.value.email,
		})

		return ResponseFactory.OK({
			body: {
				message: GENERIC_SUCCESS_MESSAGE,
			},
		})
	}
}

function makeForgotPasswordSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Request password reset",
		description:
			"Accept a password reset request and always return a generic success message to avoid account enumeration.",
		body: forgotPasswordRequestSchema,
		responses: {
			200: {
				description: "Password reset request accepted",
				schema: forgotPasswordResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			429: { description: "Too Many Requests", schema: errorResponseSchema },
		},
	})
}
