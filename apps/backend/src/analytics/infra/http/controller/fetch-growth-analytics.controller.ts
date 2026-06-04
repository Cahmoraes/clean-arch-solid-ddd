import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { FetchGrowthAnalyticsUseCase } from "@/analytics/application/use-case/fetch-growth-analytics.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { ANALYTICS_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"

const querySchema = z.object({
	period: z.string().default("30d"),
})

const periodCountSchema = z.object({
	date: z.string().meta({ description: "Date (YYYY-MM-DD)" }),
	count: z.number().meta({ description: "Count for this period" }),
})

@injectable()
export class FetchGrowthAnalyticsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics)
		private readonly useCase: FetchGrowthAnalyticsUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "FetchGrowthAnalyticsController" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			"/admin/analytics/growth",
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeSwaggerSchema(),
		)
	}

	public async callback(req: FastifyRequest) {
		const parseResult = this.parseRequest(querySchema, req.query)
		if (parseResult.isFailure()) {
			return this.createResponseError(parseResult)
		}
		const result = await this.useCase.execute({
			period: parseResult.forceSuccess().value.period,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.OK({ body: result.forceSuccess().value })
	}
}

function makeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["analytics"],
		summary: "Fetch growth analytics",
		description: "Returns total members, new members count, period series and active members trend.",
		security: true,
		querystring: querySchema,
		responses: {
			200: {
				description: "Growth analytics retrieved successfully",
				schema: z.object({
					totalMembers: z.number().meta({ description: "Total members up to period end" }),
					newMembersCount: z.number().meta({ description: "New members in period" }),
					newMembersPerPeriod: z
						.array(periodCountSchema)
						.meta({ description: "New members grouped by day or week" }),
					activeMembersTrend: z
						.array(periodCountSchema)
						.meta({ description: "Active members trend grouped by day or week" }),
				}),
			},
		},
	})
}
