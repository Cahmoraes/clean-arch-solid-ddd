import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { UserMetricsUseCase } from "@/user/application/use-case/user-metrics.usecase"
import { CheckInRoutes } from "./routes/check-in-routes"

const metricsRequestSchema = z.object({
	userId: z.string().meta({
		description: "User ID to get metrics for",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class MetricsController extends BaseController {
	constructor(
		@inject(USER_TYPES.UseCases.UserMetrics)
		private readonly userMetricsUseCase: UserMetricsUseCase,
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.server.register(
			"get",
			CheckInRoutes.METRICS,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeMetricsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedRequest = this.parseRequest(metricsRequestSchema, req.params)
		if (parsedRequest.isFailure()) {
			return this.createResponseError(parsedRequest)
		}

		const requesterId = req.user.sub.id
		const targetId = parsedRequest.value.userId
		const isAdmin = req.user.sub.role === "ADMIN"
		if (requesterId !== targetId && !isAdmin) {
			return ResponseFactory.FORBIDDEN({ message: "Forbidden" })
		}

		const metrics = await this.userMetricsUseCase.execute(parsedRequest.value)
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: metrics,
		})
	}
}

function makeMetricsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Get user check-in metrics",
		description: "Get check-in metrics (total count) for a specific user",
		security: true,
		params: metricsRequestSchema,
		responses: {
			200: {
				description: "User metrics retrieved successfully",
				schema: z.object({
					checkInsCount: z
						.number()
						.meta({ description: "Total number of check-ins", example: 42 }),
				}),
			},
			400: {
				description: "Invalid params",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			403: {
				description: "Forbidden — user can only access their own metrics",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
