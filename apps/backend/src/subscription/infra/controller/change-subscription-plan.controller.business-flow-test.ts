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

const USER_ID = "user-change-1"
const CREDENTIALS = { email: "change@test.com", password: "any_password" }

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-mensal",
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
		planId: "plan-mensal",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("ChangeSubscriptionPlanController", () => {
	let fastifyServer: FastifyAdapter
	let subscriptionRepository: InMemorySubscriptionRepository
	let gateway: TestingSubscriptionGateway
	let token: string

	beforeEach(async () => {
		container.snapshot()
		const userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		const planRepository = new InMemoryPlanRepository()
		await planRepository.save(makePlan())
		await planRepository.save(
			makePlan({
				id: "plan-anual",
				name: "Premium Anual",
				billingPeriod: "yearly",
				stripePriceId: "price_yearly",
			}),
		)
		gateway = new TestingSubscriptionGateway()
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
			.toConstantValue(gateway)
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

	function patchPlan(body: unknown) {
		return request(fastifyServer.server)
			.patch(SubscriptionRoutes.ME_PLAN)
			.set("Authorization", `Bearer ${token}`)
			.send(body as object)
	}

	test("Deve retornar 401 sem JWT", async () => {
		const response = await request(fastifyServer.server)
			.patch(SubscriptionRoutes.ME_PLAN)
			.send({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 200 e o novo plano na mesma assinatura", async () => {
		await subscriptionRepository.save(makeSubscription())

		const response = await patchPlan({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: "sub-1",
			state: "active",
			plan: {
				id: "plan-anual",
				name: "Premium Anual",
				priceId: "price_yearly",
			},
		})
		expect(subscriptionRepository.data.size).toBe(1)
		expect(gateway.changedPrices).toHaveLength(1)
	})

	test("Deve retornar 400 quando o body não tem priceId", async () => {
		const response = await patchPlan({})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 404 quando o priceId não corresponde a nenhum plano", async () => {
		await subscriptionRepository.save(makeSubscription())

		const response = await patchPlan({ priceId: "price_unknown" })

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})

	test("Deve retornar 404 com a mensagem esperada quando não há assinatura ativa", async () => {
		const response = await patchPlan({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body.message).toBe("Você não possui assinatura ativa")
	})

	test("Deve retornar 409 quando há cancelamento agendado", async () => {
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const response = await patchPlan({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
		expect(gateway.changedPrices).toEqual([])
	})
})
