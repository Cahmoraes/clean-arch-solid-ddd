import Stripe from "stripe"
import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { env } from "@/shared/infra/env"
import { StripeSubscriptionGateway } from "@/shared/infra/gateway/stripe-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Queue } from "@/shared/infra/queue/queue"
import { QUEUES } from "@/shared/infra/queue/queues"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { StripeWebhookQueuePayload } from "@/subscription/infra/worker/stripe-webhook-worker"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

function makeStripeEventPayload(
	overrides: Partial<Record<string, unknown>> = {},
): string {
	const event = {
		id: "evt_test_webhook_123",
		object: "event",
		api_version: "2026-05-27.dahlia",
		created: Math.floor(Date.now() / 1000),
		data: { object: {} },
		livemode: false,
		pending_webhooks: 1,
		request: null,
		type: "customer.subscription.updated",
		...overrides,
	}
	return JSON.stringify(event)
}

describe("StripeWebhookController", () => {
	let fastifyServer: FastifyAdapter
	let queue: Queue
	let stripe: Stripe

	beforeEach(async () => {
		container.snapshot()
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.to(StripeSubscriptionGateway)
			.inSingletonScope()
		queue = container.get<Queue>(SHARED_TYPES.Queue)
		stripe = new Stripe(env.STRIPE_PRIVATE_KEY, {
			apiVersion: "2026-05-27.dahlia",
		})
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("deve retornar 400 quando stripe-signature está ausente", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.STRIPE_WEBHOOK)
			.set("content-type", "application/json")
			.send(makeStripeEventPayload())

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("deve retornar 400 quando stripe-signature é inválida", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.STRIPE_WEBHOOK)
			.set("stripe-signature", "t=invalid,v1=invalidsig")
			.set("content-type", "application/json")
			.send(makeStripeEventPayload())

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("deve retornar 200 quando stripe-signature é válida", async () => {
		const payload = makeStripeEventPayload()
		const signature = stripe.webhooks.generateTestHeaderString({
			payload,
			secret: env.STRIPE_WEBHOOK_SECRET,
		})

		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.STRIPE_WEBHOOK)
			.set("stripe-signature", signature)
			.set("content-type", "application/json")
			.send(payload)

		expect(response.status).toBe(HTTP_STATUS.OK)
	})

	test("deve publicar na fila quando assinatura é válida", async () => {
		const payload = makeStripeEventPayload({
			id: "evt_test_publish_456",
			type: "customer.subscription.updated",
		})
		const signature = stripe.webhooks.generateTestHeaderString({
			payload,
			secret: env.STRIPE_WEBHOOK_SECRET,
		})

		const received: StripeWebhookQueuePayload[] = []
		await queue.consume(
			QUEUES.STRIPE_WEBHOOK,
			(msg: StripeWebhookQueuePayload) => received.push(msg),
		)

		await request(fastifyServer.server)
			.post(SubscriptionRoutes.STRIPE_WEBHOOK)
			.set("stripe-signature", signature)
			.set("content-type", "application/json")
			.send(payload)

		expect(received).toHaveLength(1)
		expect(received[0]).toMatchObject({
			eventId: "evt_test_publish_456",
			eventType: "customer.subscription.updated",
		})
	})
})
