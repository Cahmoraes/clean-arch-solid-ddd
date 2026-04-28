import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import Stripe from "stripe"
import type { Controller } from "@/shared/infra/controller/controller"
import { Logger } from "@/shared/infra/decorator/logger"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Queue } from "@/shared/infra/queue/queue"
import { QUEUES } from "@/shared/infra/queue/queues"
import type {
	HandleCallbackResponse,
	HttpServer,
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
		await this.httpServer.register("post", SubscriptionRoutes.STRIPE_WEBHOOK, {
			callback: this.handler,
		})
	}

	private async handler(req: FastifyRequest): Promise<HandleCallbackResponse> {
		const signature = this.signatureFromHeaders(req.headers)
		if (!signature || !req.rawBody) {
			return { status: 400, body: { message: "Missing stripe-signature" } }
		}

		let event: Stripe.Event
		try {
			event = await this.subscriptionGateway.createEventWebhook(
				req.rawBody,
				signature,
			)
		} catch (error) {
			if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
				return { status: 400, body: { message: "Invalid stripe signature" } }
			}
			throw error
		}

		void this.queue.publish(QUEUES.STRIPE_WEBHOOK, {
			eventId: event.id,
			eventType: event.type,
			eventData: event,
		})

		return { status: 200, body: null }
	}

	private signatureFromHeaders(
		headers: FastifyRequest["headers"],
	): string | undefined {
		const sig = headers["stripe-signature"]
		if (Array.isArray(sig)) return sig[0]
		return sig
	}
}
