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

const USER_ID = "user-cancel-1"
const CREDENTIALS = { email: "cancel@test.com", password: "any_password" }

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

describe("ScheduleSubscriptionCancellationController", () => {
	let fastifyServer: FastifyAdapter
	let subscriptionRepository: InMemorySubscriptionRepository
	let token: string

	beforeEach(async () => {
		container.snapshot()
		const userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		const planRepository = new InMemoryPlanRepository()
		await planRepository.save(
			Plan.restore({
				id: "plan-1",
				name: "Premium Mensal",
				priceCents: 4990,
				billingPeriod: "monthly",
				tagline: "Tagline",
				features: [],
				isActive: true,
				stripePriceId: "price_monthly",
			}),
		)
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

	function postCancel() {
		return request(fastifyServer.server)
			.post(SubscriptionRoutes.ME_CANCEL)
			.set("Authorization", `Bearer ${token}`)
	}

	test("Deve retornar 401 sem JWT", async () => {
		const response = await request(fastifyServer.server).post(
			SubscriptionRoutes.ME_CANCEL,
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 200 com cancelAtPeriodEnd true e a assinatura ainda ativa", async () => {
		await subscriptionRepository.save(makeSubscription())

		const response = await postCancel()

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: "sub-1",
			state: "cancel_scheduled",
			cancelAtPeriodEnd: true,
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
		})
	})

	test("Deve retornar 200 também ao cancelar de novo (idempotente)", async () => {
		await subscriptionRepository.save(makeSubscription())

		const first = await postCancel()
		const second = await postCancel()

		expect(first.status).toBe(HTTP_STATUS.OK)
		expect(second.status).toBe(HTTP_STATUS.OK)
		expect(second.body.cancelAtPeriodEnd).toBe(true)
	})

	test("Deve retornar 404 com a mensagem esperada quando não há assinatura ativa", async () => {
		const response = await postCancel()

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body.message).toBe("Você não possui assinatura ativa")
	})
})
