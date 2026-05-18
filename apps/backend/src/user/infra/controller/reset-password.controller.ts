import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import type { ResetPasswordUseCase } from "@/user/application/use-case/reset-password.usecase"
import { UserRoutes } from "./routes/user-routes"

const resetPasswordSchema = z.object({
	token: z.string().min(1).meta({
		description: "Password reset token",
		example: "12ab34cd56ef78gh90ij12kl34mn56op",
	}),
	newPassword: z.string().min(8).max(128).meta({
		description: "New password (min 8 characters)",
		example: "NewPass456!",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

export class ResetPasswordController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.ResetPassword)
		private readonly resetPassword: ResetPasswordUseCase,
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
		await this.server.register(
			"post",
			UserRoutes.RESET_PASSWORD,
			{
				callback: this.callback,
			},
			makeResetPasswordSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		if (error.name === "InvalidResetTokenError") {
			return ResponseFactory.BAD_REQUEST({
				message: "Token inválido ou expirado.",
			})
		}
		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(resetPasswordSchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}
		const result = await this.resetPassword.execute({
			token: parsedBodyOrError.value.token,
			newPassword: parsedBodyOrError.value.newPassword,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.NO_CONTENT()
	}
}

function makeResetPasswordSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Reset password",
		description: "Reset the user password using a valid password reset token.",
		body: resetPasswordSchema,
		responses: {
			204: { description: "Password reset successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
			422: { description: "Unprocessable Entity", schema: errorResponseSchema },
		},
	})
}
