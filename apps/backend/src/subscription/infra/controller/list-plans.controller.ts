import { inject, injectable } from "inversify"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import type { BillingPeriod, Plan } from "@/subscription/domain/plan"
import type { ListActivePlansUseCase } from "../../application/use-case/list-active-plans.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
	monthly: "mês",
	yearly: "ano",
}

function formatPriceLabel(
	priceCents: number,
	billingPeriod: BillingPeriod,
): string {
	const amount = (priceCents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
	return `R$ ${amount}/${BILLING_PERIOD_LABEL[billingPeriod]}`
}

function toPublicPlan(plan: Plan) {
	return {
		id: plan.id,
		name: plan.name,
		priceId: plan.stripePriceId,
		priceLabel: formatPriceLabel(plan.priceCents, plan.billingPeriod),
		tagline: plan.tagline,
		features: plan.features,
	}
}

@injectable()
export class ListPlansController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ListActivePlans)
		private readonly listActivePlans: ListActivePlansUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.server.register("get", SubscriptionRoutes.PLANS, {
			callback: this.callback,
			rateLimit: { max: 100, timeWindow: 60_000 },
		})
	}

	private async callback() {
		const plans = await this.listActivePlans.execute()
		return ResponseFactory.OK({ body: plans.map(toPublicPlan) })
	}
}
