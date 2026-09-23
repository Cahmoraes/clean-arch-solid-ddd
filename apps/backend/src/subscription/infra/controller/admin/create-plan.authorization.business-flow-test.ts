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
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const VALID_BODY = {
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados"],
}

describe("Autorização de POST /admin/plans", () => {
	let fastifyServer: FastifyAdapter
	let planRepository: InMemoryPlanRepository
	let authenticate: AuthenticateUseCase
	let memberToken: string
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
			email: "member.plans@test.com",
			password: "any_password",
			role: "MEMBER",
		})
		await createAndSaveUser({
			userRepository,
			email: "admin.plans@test.com",
			password: "any_password",
			role: "ADMIN",
		})
		memberToken = await login("member.plans@test.com")
		adminToken = await login("admin.plans@test.com")
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("403 para MEMBER e nenhum plano criado", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.ADMIN_PLANS)
			.set("Authorization", `Bearer ${memberToken}`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(planRepository.plans.size).toBe(0)
	})

	test("201 para ADMIN e plano criado", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.ADMIN_PLANS)
			.set("Authorization", `Bearer ${adminToken}`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(planRepository.plans.size).toBe(1)
	})
})
