import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { SubscriptionRoutes } from "./routes/subscription-routes"

describe("CreateSubscriptionController", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let subscriptionRepository: InMemorySubscriptionRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
			.toConstantValue(subscriptionRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(new TestingSubscriptionGateway())
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function authenticatedToken(props: {
		email: string
		password: string
	}): Promise<string> {
		const result = await authenticate.execute(props)
		return result.force.success().value.token
	}

	test("Deve retornar 201 e criar a Subscription quando o user tem billingCustomerId", async () => {
		const credentials = {
			email: "subscriber@test.com",
			password: "any_password",
		}
		const user = await createAndSaveUser({
			userRepository,
			id: "user-with-billing",
			email: credentials.email,
			password: credentials.password,
		})
		user.assignBillingCustomerId("cus_existing_billing")
		await userRepository.update(user)

		const token = await authenticatedToken(credentials)

		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send({ priceId: "price_test_123", paymentMethodId: "pm_test_visa" })

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toHaveProperty("subscriptionId")
		expect(response.body).toHaveProperty("status", "active")

		const saved = await subscriptionRepository.ofUserId("user-with-billing")
		expect(saved).not.toBeNull()
		expect(saved?.customerId).toBe("cus_existing_billing")
		expect(saved?.billingSubscriptionId).toBe(response.body.subscriptionId)
	})

	test("Deve retornar 401 quando JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.send({ priceId: "price_test_123", paymentMethodId: "pm_test_visa" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 409 quando user autenticado não possui billingCustomerId", async () => {
		const credentials = {
			email: "no-billing@test.com",
			password: "any_password",
		}
		await createAndSaveUser({
			userRepository,
			id: "user-no-billing",
			email: credentials.email,
			password: credentials.password,
		})
		const token = await authenticatedToken(credentials)

		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send({ priceId: "price_test_123", paymentMethodId: "pm_test_visa" })

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 400 quando o body é inválido (sem priceId)", async () => {
		const credentials = {
			email: "bad-body@test.com",
			password: "any_password",
		}
		const user = await createAndSaveUser({
			userRepository,
			id: "user-bad-body",
			email: credentials.email,
			password: credentials.password,
		})
		user.assignBillingCustomerId("cus_bad_body")
		await userRepository.update(user)
		const token = await authenticatedToken(credentials)

		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send({ paymentMethodId: "pm_test_visa" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 quando o body é inválido (sem paymentMethodId)", async () => {
		const credentials = {
			email: "bad-body-2@test.com",
			password: "any_password",
		}
		const user = await createAndSaveUser({
			userRepository,
			id: "user-bad-body-2",
			email: credentials.email,
			password: credentials.password,
		})
		user.assignBillingCustomerId("cus_bad_body_2")
		await userRepository.update(user)
		const token = await authenticatedToken(credentials)

		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send({ priceId: "price_test_123" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})
})
