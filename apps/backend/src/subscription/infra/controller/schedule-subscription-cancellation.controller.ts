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
import type { ScheduleSubscriptionCancellationUseCase } from "../../application/use-case/schedule-subscription-cancellation.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"
import { mySubscriptionResponseSchema } from "./schema/my-subscription-response-schema.js"

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class ScheduleSubscriptionCancellationController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation)
		private readonly scheduleCancellation: ScheduleSubscriptionCancellationUseCase,
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
			"post",
			SubscriptionRoutes.ME_CANCEL,
			{ callback: this.callback, isProtected: true },
			makeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const result = await this.scheduleCancellation.execute({
			userId: req.user.sub.id,
		})
		if (result.isFailure()) return this.createResponseError(result)
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["subscriptions"],
		summary:
			"Schedule the cancellation of the authenticated user's subscription",
		description:
			"Marks the subscription to be canceled at the end of the paid period. Calling it again keeps the scheduled state.",
		security: true,
		responses: {
			200: {
				description: "Subscription with the cancellation scheduled",
				schema: mySubscriptionResponseSchema,
			},
			401: { description: "Unauthorized", schema: errorResponseSchema },
			404: {
				description: "No active subscription",
				schema: errorResponseSchema,
			},
		},
	})
}
