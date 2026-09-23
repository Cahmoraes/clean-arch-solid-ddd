import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { Plan } from "@/subscription/domain/plan"
import { SubscriptionRoutes } from "./routes/subscription-routes"

describe("GET /plans", () => {
	let fastifyServer: FastifyAdapter
	let planRepository: InMemoryPlanRepository

	beforeEach(async () => {
		container.snapshot()
		planRepository = new InMemoryPlanRepository()
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("retorna array de planos ativos com shape correto", async () => {
		const plan = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Acesso ilimitado a todas as academias parceiras.",
			features: ["Check-ins ilimitados"],
			stripePriceId: "price_demo_monthly",
		}).forceSuccess().value
		await planRepository.save(plan)

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

	test("com todos os planos inativos retorna 200 e lista vazia, não um erro", async () => {
		const inactive = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		})
			.forceSuccess()
			.value.inactivate()
		await planRepository.save(inactive)

		const response = await request(fastifyServer.server).get(
			SubscriptionRoutes.PLANS,
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual([])
	})
})
