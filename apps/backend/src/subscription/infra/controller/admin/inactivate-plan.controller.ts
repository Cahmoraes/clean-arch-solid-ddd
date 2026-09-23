import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { BILLING_PERIODS } from "@/subscription/domain/plan.js"
import type { InactivatePlanUseCase } from "../../../application/use-case/inactivate-plan.usecase.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const inactivatePlanParamsSchema = z.object({
	id: z.string().min(1).meta({ description: "Plan ID" }),
})

@injectable()
export class InactivatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.InactivatePlan)
		private readonly inactivatePlan: InactivatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.server.register(
			"patch",
			SubscriptionRoutes.ADMIN_PLAN_INACTIVATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeInactivatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			inactivatePlanParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const result = await this.inactivatePlan.execute(
			parsedParamsOrError.value.id,
		)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const plan = result.value
		return ResponseFactory.OK({
			body: {
				id: plan.id,
				name: plan.name,
				priceCents: plan.priceCents,
				billingPeriod: plan.billingPeriod,
				tagline: plan.tagline,
				features: plan.features,
				isActive: plan.isActive,
				stripePriceId: plan.stripePriceId,
			},
		})
	}
}

function makeInactivatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Inactivate a plan",
		description: "Marks a plan as inactive (soft delete). Requires ADMIN role",
		security: true,
		params: inactivatePlanParamsSchema,
		responses: {
			200: {
				description: "Plan inactivated successfully",
				schema: z.object({
					id: z.string(),
					name: z.string(),
					priceCents: z.number(),
					billingPeriod: z.enum(BILLING_PERIODS),
					tagline: z.string(),
					features: z.array(z.string()),
					isActive: z.boolean(),
					stripePriceId: z.string(),
				}),
			},
			404: {
				description: "Plan not found",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
