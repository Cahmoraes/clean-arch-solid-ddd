import { inject, injectable } from "inversify"
import { z } from "zod"
import type { GetCheckInStatsUseCase } from "@/check-in/application/use-case/get-check-in-stats.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

@injectable()
export class GetCheckInStatsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.GetCheckInStats)
		private readonly getCheckInStats: GetCheckInStatsUseCase,
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
	async init() {
		this.server.register(
			"get",
			CheckInRoutes.STATS,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeGetCheckInStatsSwaggerSchema(),
		)
	}

	private async callback() {
		const stats = await this.getCheckInStats.execute()
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: stats,
		})
	}
}

function makeGetCheckInStatsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Get check-in stats",
		description:
			"Get aggregated check-in statistics (total, pending, validated, rejected). Requires ADMIN role.",
		security: true,
		responses: {
			200: {
				description: "Check-in stats retrieved successfully",
				schema: z.object({
					total: z
						.number()
						.meta({ description: "Total number of check-ins", example: 100 }),
					pending: z
						.number()
						.meta({ description: "Number of pending check-ins", example: 40 }),
					validated: z.number().meta({
						description: "Number of validated check-ins",
						example: 50,
					}),
					rejected: z.number().meta({
						description: "Number of rejected check-ins",
						example: 10,
					}),
				}),
			},
		},
	})
}
