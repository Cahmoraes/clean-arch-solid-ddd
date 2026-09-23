import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import type { ListPlansAdminUseCase } from "@/subscription/application/use-case/list-plans-admin.usecase.js"
import { BILLING_PERIODS } from "@/subscription/domain/plan.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

@injectable()
export class ListPlansAdminController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ListPlansAdmin)
		private readonly listPlansAdmin: ListPlansAdminUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.server.register(
			"get",
			SubscriptionRoutes.ADMIN_PLANS,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeListPlansAdminSwaggerSchema(),
		)
	}

	private async callback() {
		const plans = await this.listPlansAdmin.execute()
		return ResponseFactory.OK({
			body: plans.map((plan) => ({
				id: plan.id,
				name: plan.name,
				priceCents: plan.priceCents,
				billingPeriod: plan.billingPeriod,
				tagline: plan.tagline,
				features: plan.features,
				isActive: plan.isActive,
				stripePriceId: plan.stripePriceId,
			})),
		})
	}
}

function makeListPlansAdminSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "List all plans",
		description: "List every plan, active and inactive. Requires ADMIN role",
		security: true,
		responses: {
			200: {
				description: "Plans listed successfully",
				schema: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						priceCents: z.number(),
						billingPeriod: z.enum(BILLING_PERIODS),
						tagline: z.string(),
						features: z.array(z.string()),
						isActive: z.boolean(),
						stripePriceId: z.string(),
					}),
				),
			},
		},
	})
}
