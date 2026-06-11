import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { FetchRetentionAnalyticsUseCase } from "@/analytics/application/use-case/fetch-retention-analytics.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { ANALYTICS_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"

const querySchema = z.object({
	period: z.string().default("30d"),
})

@injectable()
export class FetchRetentionAnalyticsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics)
		private readonly useCase: FetchRetentionAnalyticsUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "FetchRetentionAnalyticsController" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			"/admin/analytics/retention",
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
		summary: "Fetch retention analytics",
		description:
			"Returns active/inactive member counts, churn rate and at-risk members list.",
		security: true,
		querystring: querySchema,
		responses: {
			200: {
				description: "Retention analytics retrieved successfully",
				schema: z.object({
					activeCount: z
						.number()
						.meta({ description: "Members active in last 30 days" }),
					inactiveCount: z
						.number()
						.meta({ description: "Members inactive for 30+ days" }),
					churnRate: z
						.number()
						.meta({ description: "Churn rate percentage (0-100)" }),
					atRiskMembers: z
						.array(
							z.object({
								id: z.string().meta({ description: "User ID" }),
								name: z.string().meta({ description: "User name" }),
								daysSinceLastCheckIn: z
									.number()
									.meta({ description: "Days since last check-in" }),
							}),
						)
						.meta({
							description: "Members with no check-in in the last 14 days",
						}),
				}),
			},
		},
	})
}
