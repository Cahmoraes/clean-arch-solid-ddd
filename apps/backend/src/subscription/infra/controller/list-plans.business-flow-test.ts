import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { SubscriptionRoutes } from "./routes/subscription-routes"

describe("GET /plans", () => {
	let fastifyServer: FastifyAdapter

	beforeEach(async () => {
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		await fastifyServer.close()
	})

	test("retorna array de planos disponíveis com shape correto", async () => {
		const response = await request(fastifyServer.server).get(
			SubscriptionRoutes.PLANS,
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body as unknown[]).toBeInstanceOf(Array)
		expect((response.body as unknown[]).length).toBeGreaterThan(0)
		expect((response.body as unknown[])[0]).toMatchObject({
			id: expect.any(String),
			name: expect.any(String),
			priceId: expect.any(String),
			priceLabel: expect.any(String),
			tagline: expect.any(String),
			features: expect.any(Array),
		})
	})
})
