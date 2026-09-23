import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase.js"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { Plan } from "@/subscription/domain/plan"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const VALID_BODY = {
	name: "Premium Mensal Editado",
	priceCents: 5990,
	billingPeriod: "monthly",
	tagline: "Nova tagline.",
	features: ["Check-ins ilimitados"],
}

describe("PUT /admin/plans/:id", () => {
	let fastifyServer: FastifyAdapter
	let planRepository: InMemoryPlanRepository
	let authenticate: AuthenticateUseCase
	let adminToken: string

	async function login(email: string): Promise<string> {
		const result = await authenticate.execute({
			email,
			password: "any_password",
		})
		return result.force.success().value.token
	}

	beforeEach(async () => {
		container.snapshot()
		planRepository = new InMemoryPlanRepository()
		const userRepository = new InMemoryUserRepository()
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		await createAndSaveUser({
			userRepository,
			email: "admin.update-plan@test.com",
			password: "any_password",
			role: "ADMIN",
		})
		adminToken = await login("admin.update-plan@test.com")
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("id inexistente retorna 404 com corpo de erro explícito, nunca 500", async () => {
		const response = await request(fastifyServer.server)
			.put(`${SubscriptionRoutes.ADMIN_PLANS}/id-inexistente`)
			.set("Authorization", `Bearer ${adminToken}`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toHaveProperty("message")
	})

	test("edita plano existente e retorna 200 com os campos atualizados, preservando isActive", async () => {
		const existing = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline antiga.",
			features: ["Check-ins ilimitados"],
		})
			.forceSuccess()
			.value.inactivate()
		await planRepository.save(existing)

		const response = await request(fastifyServer.server)
			.put(`${SubscriptionRoutes.ADMIN_PLANS}/${existing.id}`)
			.set("Authorization", `Bearer ${adminToken}`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: existing.id,
			name: VALID_BODY.name,
			priceCents: VALID_BODY.priceCents,
			tagline: VALID_BODY.tagline,
			features: VALID_BODY.features,
			isActive: false,
		})
	})
})
