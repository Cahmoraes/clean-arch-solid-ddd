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
import type { CreatePlanUseCase } from "../../../application/use-case/create-plan.usecase.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const createPlanBodySchema = z.object({
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

export type CreatePlanPayload = z.infer<typeof createPlanBodySchema>

@injectable()
export class CreatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.CreatePlan)
		private readonly createPlan: CreatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.server.register(
			"post",
			SubscriptionRoutes.ADMIN_PLANS,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeCreatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(createPlanBodySchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.createPlan.execute(parsedBodyOrError.value)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const plan = result.value
		return ResponseFactory.CREATED({
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

function makeCreatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Create a plan",
		description: "Create a new subscription plan. Requires ADMIN role",
		security: true,
		body: createPlanBodySchema,
		responses: {
			201: {
				description: "Plan created successfully",
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
			403: {
				description: "Forbidden — requires ADMIN role",
				schema: z.object({ message: z.string() }),
			},
			422: {
				description: "Invalid request",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
