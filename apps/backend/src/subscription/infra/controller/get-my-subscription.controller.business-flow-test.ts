import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { SubscriptionRoutes } from "./routes/subscription-routes"

const USER_ID = "user-me-1"
const CREDENTIALS = { email: "me@test.com", password: "any_password" }

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-1",
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Tagline",
		features: [],
		isActive: true,
		stripePriceId: "price_monthly",
		...overrides,
	})
}

function makeSubscription(
	overrides: Partial<Parameters<typeof Subscription.restore>[0]> = {},
) {
	return Subscription.restore({
		id: "sub-1",
		userId: USER_ID,
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("GetMySubscriptionController", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository
	let token: string

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		planRepository = new InMemoryPlanRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
			.toConstantValue(subscriptionRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(new TestingSubscriptionGateway())
		const authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		await createAndSaveUser({
			userRepository,
			id: USER_ID,
			email: CREDENTIALS.email,
			password: CREDENTIALS.password,
		})
		token = (await authenticate.execute(CREDENTIALS)).force.success().value
			.token
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar 401 sem JWT", async () => {
		const response = await request(fastifyServer.server).get(
			SubscriptionRoutes.ME,
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 200 com corpo null quando o usuário não tem assinatura", async () => {
		const response = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.text).toBe("null")
	})

	test("Deve retornar 200 com a assinatura, plano embutido e estado active", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(makeSubscription())

		const response = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
			currentPeriodStart: "2026-01-01T00:00:00.000Z",
			currentPeriodEnd: "2999-01-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
		})
	})

	test("Deve retornar state expired quando o cancelamento agendado já venceu", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(
			makeSubscription({
				cancelAtPeriodEnd: true,
				currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
			}),
		)

		const response = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.state).toBe("expired")
	})

	test("Deve retornar o plano inativado e plan null para linha legada", async () => {
		await planRepository.save(makePlan().inactivate())
		await subscriptionRepository.save(makeSubscription())

		const inactive = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(inactive.body.plan).toEqual({
			id: "plan-1",
			name: "Premium Mensal",
			priceId: "price_monthly",
		})

		subscriptionRepository.data.clear()
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const legacy = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(legacy.status).toBe(HTTP_STATUS.OK)
		expect(legacy.body.plan).toBeNull()
	})
})
