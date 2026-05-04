import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { UserMetricsUseCase } from "@/user/application/use-case/user-metrics.usecase"
import { UserRoutes } from "./routes/user-routes"

export class UserMetricsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.UserMetrics)
		private readonly userMetrics: UserMetricsUseCase,
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
	public async init(): Promise<void> {
		this.server.register(
			"get",
			UserRoutes.METRICS,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeUserMetricsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const {
			sub: { id },
		} = req.user
		const metrics = await this.userMetrics.execute({ userId: id })
		return ResponseFactory.create({
			status: 200,
			body: metrics,
		})
	}
}

const metricsResponseSchema = z.object({
	checkInsCount: z
		.number()
		.meta({ description: "Total check-ins count", example: 42 }),
})

function makeUserMetricsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get user metrics",
		description: "Get metrics for the currently authenticated user.",
		security: true,
		responses: {
			200: {
				description: "User metrics retrieved successfully",
				schema: metricsResponseSchema,
			},
			401: { description: "Unauthorized" },
		},
	})
}
