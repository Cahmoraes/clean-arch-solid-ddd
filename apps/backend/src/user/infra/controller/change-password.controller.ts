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
import type { ChangePasswordUseCase } from "@/user/application/use-case/change-password.usecase"
import { UserRoutes } from "./routes/user-routes"

const changePasswordSchema = z.object({
	newRawPassword: z.string().min(8).max(128).meta({
		description: "New password (min 8 characters)",
		example: "newpass123",
	}),
})

export class ChangePasswordController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.ChangePassword)
		private readonly changePassword: ChangePasswordUseCase,
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
			"patch",
			UserRoutes.CHANGE_PASSWORD,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeChangePasswordSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return ResponseFactory.CONFLICT({
			message: error.message,
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(changePasswordSchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.changePassword.execute({
			userId: this.extractUserId(req),
			newRawPassword: parsedBodyOrError.value.newRawPassword,
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.NO_CONTENT()
	}

	private extractUserId(req: FastifyRequest): string {
		return req.user.sub.id
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeChangePasswordSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Change user password",
		description: "Change the password of the currently authenticated user.",
		security: true,
		body: changePasswordSchema,
		responses: {
			204: { description: "Password changed successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			409: { description: "Conflict", schema: errorResponseSchema },
		},
	})
}
