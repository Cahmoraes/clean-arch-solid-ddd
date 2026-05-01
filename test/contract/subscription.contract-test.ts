import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { SubscriptionRoutes } from "@/subscription/infra/controller/routes/subscription-routes"

describe("Subscription Contract Tests", () => {
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

	async function getToken(email: string, password: string): Promise<string> {
		const result = await authenticate.execute({ email, password })
		return result.force.success().value.token
	}

	describe("POST /subscriptions", () => {
		test("deve satisfazer a spec com status 201 ao criar subscription", async () => {
			const credentials = {
				email: "sub@test.com",
				password: "any_password",
			}
			const user = await createAndSaveUser({
				userRepository,
				id: "user-sub-id",
				...credentials,
			})
			user.assignBillingCustomerId("cus_test_123")
			await userRepository.update(user)

			const token = await getToken(credentials.email, credentials.password)

			const response = await request(fastifyServer.server)
				.post(SubscriptionRoutes.CREATE)
				.set("Authorization", `Bearer ${token}`)
				.send({ priceId: "price_test_123", paymentMethodId: "pm_test_visa" })

			expect(response.status).toBe(201)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server)
				.post(SubscriptionRoutes.CREATE)
				.send({ priceId: "price_test_123", paymentMethodId: "pm_test_visa" })

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("POST /webhook/stripe", () => {
		test("deve satisfazer a spec com status 400 sem stripe-signature", async () => {
			const response = await request(fastifyServer.server)
				.post(SubscriptionRoutes.STRIPE_WEBHOOK)
				.send({ type: "customer.subscription.updated" })

			expect(response.status).toBe(400)
			expect(response).toSatisfyApiSpec()
		})
	})
})
