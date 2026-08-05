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
import type { BulkChangeUserStatusUseCase } from "@/user/application/use-case/bulk-change-user-status.usecase"
import { UserRoutes } from "./routes/user-routes"

const bulkDeactivateUsersSchema = z.object({
	userIds: z.array(z.string().uuid()).min(1).max(100).meta({
		description: "IDs dos usuários a desativar em massa (1 a 100)",
	}),
})

export class BulkDeactivateUsersController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.BulkChangeUserStatus)
		private readonly bulkChangeUserStatus: BulkChangeUserStatusUseCase,
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
			"patch",
			UserRoutes.BULK_DEACTIVATE_USERS,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeBulkDeactivateUsersSwaggerSchema(),
		)
	}

	public async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(
			bulkDeactivateUsersSchema,
			req.body,
		)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.bulkChangeUserStatus.execute({
			requesterId: req.user.sub.id,
			userIds: parseBodyResult.value.userIds,
			targetStatus: "suspended",
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.OK({ body: result.value })
	}
}

const bulkDeactivateUsersResponseSchema = z.object({
	updated: z.number().meta({
		description: "Quantidade de usuários efetivamente desativados",
	}),
	requested: z.number().meta({
		description: "Quantidade de IDs solicitados na requisição",
	}),
	skipped: z.number().meta({
		description:
			"Quantidade de usuários ignorados (fora da política de permissão ou já no status alvo)",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeBulkDeactivateUsersSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Bulk deactivate users",
		description:
			"Deactivates multiple user accounts at once (1 to 100 IDs). Requires admin authentication.",
		security: true,
		body: bulkDeactivateUsersSchema,
		responses: {
			200: {
				description: "Users processed successfully",
				schema: bulkDeactivateUsersResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
		},
	})
}
