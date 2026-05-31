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
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import { CannotDeleteSelfError } from "@/user/application/error/cannot-delete-self-error"
import { UserIsSuperAdminError } from "@/user/application/error/user-is-super-admin-error"
import { UserNotFoundError } from "@/user/application/error/user-not-found-error"
import type { DeleteUserUseCase } from "@/user/application/use-case/delete-user.usecase"
import { UserRoutes } from "./routes/user-routes"

const deleteUserParamsSchema = z.object({
	userId: z.string().uuid().meta({
		description: "User ID to delete",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class DeleteUserController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.DeleteUser)
		private readonly deleteUser: DeleteUserUseCase,
	) {
		super()
		this.bindMethod()
	}

	private bindMethod() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.httpServer.register(
			"delete",
			UserRoutes.DELETE,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeDeleteUserSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		if (
			error instanceof CannotDeleteSelfError ||
			error instanceof UserIsSuperAdminError
		) {
			return ResponseFactory.FORBIDDEN({ message: error.message })
		}
		if (error instanceof UserNotFoundError) {
			return ResponseFactory.NOT_FOUND({ message: error.message })
		}
		return undefined
	}

	public async callback(req: FastifyRequest) {
		const parseParamsResult = this.parseRequest(
			deleteUserParamsSchema,
			req.params,
		)
		if (parseParamsResult.isFailure()) {
			return this.createResponseError(parseParamsResult)
		}

		const result = await this.deleteUser.execute({
			userId: parseParamsResult.value.userId,
			requesterId: req.user.sub.id,
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.NO_CONTENT()
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeDeleteUserSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Delete a user",
		description:
			"Soft-deletes a user by ID. Requires admin authentication. Cannot delete self or super admin.",
		security: true,
		params: deleteUserParamsSchema,
		responses: {
			204: { description: "User deleted successfully" },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
