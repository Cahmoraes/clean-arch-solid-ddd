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
import type { ChangeSubscriptionPlanUseCase } from "../../application/use-case/change-subscription-plan.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"
import { mySubscriptionResponseSchema } from "./schema/my-subscription-response-schema.js"

const changePlanRequestSchema = z.object({
	priceId: z.string().min(1).meta({
		description: "Stripe Price ID of the new plan",
		example: "price_1abc123",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class ChangeSubscriptionPlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan)
		private readonly changeSubscriptionPlan: ChangeSubscriptionPlanUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅ | 🔒" })
	public async init(): Promise<void> {
		await this.httpServer.register(
			"patch",
			SubscriptionRoutes.ME_PLAN,
			{ callback: this.callback, isProtected: true },
			makeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseResult = this.parseRequest(changePlanRequestSchema, req.body)
		if (parseResult.isFailure()) return this.createResponseError(parseResult)

		const result = await this.changeSubscriptionPlan.execute({
			userId: req.user.sub.id,
			priceId: parseResult.value.priceId,
		})
		if (result.isFailure()) return this.createResponseError(result)
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["subscriptions"],
		summary: "Change the plan of the authenticated user's subscription",
		description:
			"Switches the current subscription to another plan, keeping the same subscription.",
		body: changePlanRequestSchema,
		security: true,
		responses: {
			200: {
				description: "Subscription with the new plan",
				schema: mySubscriptionResponseSchema,
			},
			400: { description: "Invalid body", schema: errorResponseSchema },
			401: { description: "Unauthorized", schema: errorResponseSchema },
			404: {
				description: "Plan not found or no active subscription",
				schema: errorResponseSchema,
			},
			409: {
				description: "Cancellation already scheduled",
				schema: errorResponseSchema,
			},
		},
	})
}
