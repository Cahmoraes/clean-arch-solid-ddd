import { inject, injectable } from "inversify"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import type { ListPlansUseCase } from "../../application/use-case/list-plans.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

@injectable()
export class ListPlansController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ListPlans)
		private readonly listPlans: ListPlansUseCase,
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
		return ResponseFactory.OK({ body: this.listPlans.execute() })
	}
}
