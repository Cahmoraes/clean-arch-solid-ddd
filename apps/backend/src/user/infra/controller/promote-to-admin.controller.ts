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
import type { PromoteToAdminUseCase } from "@/user/application/use-case/promote-to-admin.usecase"
import { UserRoutes } from "./routes/user-routes"

const promoteToAdminSchema = z.object({
	userId: z.string().uuid().meta({
		description: "User ID to promote to admin",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class PromoteToAdminController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.PromoteToAdmin)
		private readonly promoteToAdmin: PromoteToAdminUseCase,
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
			UserRoutes.PROMOTE_TO_ADMIN,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makePromoteToAdminSwaggerSchema(),
		)
	}

	public async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(promoteToAdminSchema, req.body)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.promoteToAdmin.execute({
			requesterId: req.user.sub.id,
			userId: parseBodyResult.value.userId,
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.OK()
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makePromoteToAdminSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Promote a user to admin",
		description:
			"Promotes an active member to admin role. Requires admin authentication.",
		security: true,
		body: promoteToAdminSchema,
		responses: {
			200: { description: "User promoted to admin successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
			422: {
				description: "Unprocessable Entity",
				schema: errorResponseSchema,
			},
		},
	})
}
