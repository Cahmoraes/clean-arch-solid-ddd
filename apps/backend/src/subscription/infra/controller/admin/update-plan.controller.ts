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
import type { UpdatePlanUseCase } from "../../../application/use-case/update-plan.usecase.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const updatePlanParamsSchema = z.object({
	id: z.string().min(1).meta({ description: "Plan ID" }),
})

const updatePlanBodySchema = z.object({
	name: z
		.string()
		.min(1)
		.meta({ description: "Plan name", example: "Premium Mensal" }),
	priceCents: z
		.number()
		.int()
		.min(0)
		.meta({ description: "Price in cents, never negative", example: 4990 }),
	billingPeriod: z.enum(BILLING_PERIODS).meta({
		description: "Billing period",
		example: "monthly",
	}),
	tagline: z.string().min(1).meta({
		description: "Short plan description",
		example: "Acesso ilimitado a todas as academias parceiras.",
	}),
	features: z
		.array(z.string().min(1))
		.min(1)
		.meta({ description: "Plan benefits", example: ["Check-ins ilimitados"] }),
	stripePriceId: z
		.string()
		.optional()
		.meta({ description: "Optional external Stripe price id" }),
})

export type UpdatePlanPayload = z.infer<typeof updatePlanBodySchema>

@injectable()
export class UpdatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.UpdatePlan)
		private readonly updatePlan: UpdatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"put",
			SubscriptionRoutes.ADMIN_PLAN_BY_ID,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeUpdatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			updatePlanParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const parsedBodyOrError = this.parseRequest(updatePlanBodySchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.updatePlan.execute(
			parsedParamsOrError.value.id,
			parsedBodyOrError.value,
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

function makeUpdatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Update a plan",
		description:
			"Update an existing plan's content fields. Never changes isActive. Requires ADMIN role",
		security: true,
		params: updatePlanParamsSchema,
		body: updatePlanBodySchema,
		responses: {
			200: {
				description: "Plan updated successfully",
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
			422: {
				description: "Invalid request",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
