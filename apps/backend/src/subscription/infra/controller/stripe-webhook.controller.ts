import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import Stripe from "stripe"
import { z } from "zod"
import type { Controller } from "@/shared/infra/controller/controller"

import { Logger } from "@/shared/infra/decorator/logger"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { Queue } from "@/shared/infra/queue/queue"
import { QUEUES } from "@/shared/infra/queue/queues"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import type { SubscriptionGateway } from "@/subscription/gateway/subscription-gateway"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

@injectable()
export class StripeWebhookController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
	) {
		this.bindMethod()
	}

	private bindMethod(): void {
		this.handler = this.handler.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.httpServer.register(
			"post",
			SubscriptionRoutes.STRIPE_WEBHOOK,
			{
				callback: this.handler,
			},
			makeStripeWebhookSwaggerSchema(),
		)
	}

	private async handler(req: FastifyRequest): Promise<HandleCallbackResponse> {
		const signature = this.signatureFromHeaders(req.headers)
		if (!signature || !req.rawBody) {
			return { status: 400, body: { message: "Missing stripe-signature" } }
		}
		try {
			const event = await this.subscriptionGateway.createEventWebhook(
				req.rawBody,
				signature,
			)
			this.queue.publish(QUEUES.STRIPE_WEBHOOK, {
				eventId: event.id,
				eventType: event.type,
				eventData: event,
			})
			return { status: 200, body: null }
		} catch (error) {
			if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
				return { status: 400, body: { message: "Invalid stripe signature" } }
			}
			throw error
		}
	}

	private signatureFromHeaders(
		headers: FastifyRequest["headers"],
	): string | undefined {
		const sig = headers["stripe-signature"]
		if (Array.isArray(sig)) return sig[0]
		return sig
	}
}

function makeStripeWebhookSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["subscriptions"],
		summary: "Stripe webhook endpoint",
		description:
			"Receives Stripe webhook events. The raw body is verified using the stripe-signature header.",
		responses: {
			200: { description: "Webhook event processed successfully" },
			400: {
				description: "Invalid Stripe signature",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
