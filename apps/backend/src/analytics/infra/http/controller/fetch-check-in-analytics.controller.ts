import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { FetchCheckInAnalyticsUseCase } from "@/analytics/application/use-case/fetch-check-in-analytics.usecase"
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
export class FetchCheckInAnalyticsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics)
		private readonly useCase: FetchCheckInAnalyticsUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "FetchCheckInAnalyticsController" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			"/admin/analytics/checkins",
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
		summary: "Fetch check-in analytics",
		description:
			"Returns check-in totals, daily series and hourly distribution for the given period.",
		security: true,
		querystring: querySchema,
		responses: {
			200: {
				description: "Check-in analytics retrieved successfully",
				schema: z.object({
					totalCheckIns: z
						.number()
						.meta({ description: "Total check-ins in period" }),
					dailySeries: z
						.array(periodCountSchema)
						.meta({ description: "Daily check-in counts" }),
					hourlyDistribution: z
						.array(
							z.object({
								hour: z.number().meta({ description: "Hour of day (0-23)" }),
								count: z
									.number()
									.meta({ description: "Check-in count for this hour" }),
							}),
						)
						.meta({ description: "Check-in counts per hour of day" }),
				}),
			},
		},
	})
}
