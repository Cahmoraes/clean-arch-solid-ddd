import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { vi } from "vitest"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "@/user/infra/controller/routes/user-routes"

/**
 * Integração event-driven: POST /users → DomainEventPublisher.publish("userCreated")
 * → CreateCustomerController listener → CreateCustomerUseCase → SubscriptionGateway.createCustomer
 *
 * Cobre BUG-001: garante que o listener `userCreated` está registrado e provisiona
 * o customer no Stripe automaticamente após a criação do usuário.
 */
describe("CreateCustomerController (event-driven userCreated → Stripe)", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let subscriptionGateway: TestingSubscriptionGateway

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		subscriptionGateway = new TestingSubscriptionGateway()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(subscriptionGateway)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		subscriptionGateway.clearCustomers()
		await fastifyServer.close()
	})

	async function waitForCustomer(
		email: string,
		timeoutMs = 1000,
	): Promise<void> {
		const start = Date.now()
		while (Date.now() - start < timeoutMs) {
			if (subscriptionGateway.customerByEmail(email)) return
			await new Promise((resolve) => setTimeout(resolve, 25))
		}
	}

	test("Deve provisionar customer no Stripe após POST /users (evento userCreated)", async () => {
		const input = {
			name: "Customer Provision",
			email: "provision@customer.test",
			password: "any_password",
		}

		const response = await request(fastifyServer.server)
			.post(UserRoutes.CREATE)
			.send(input)

		expect(response.status).toBe(HTTP_STATUS.CREATED)

		await waitForCustomer(input.email)

		const customer = subscriptionGateway.customerByEmail(input.email)
		expect(customer).not.toBeNull()
		expect(customer?.email).toBe(input.email)
		expect(customer?.name).toBe(input.name)

		const persistedUser = await userRepository.userOfEmail(input.email)
		expect(persistedUser).not.toBeNull()
		expect(persistedUser?.billingCustomerId).toBe(customer?.id)
		expect(customer?.metadata).toEqual({ userId: persistedUser?.id })
	})

	test("Deve invocar o gateway exatamente uma vez por evento userCreated", async () => {
		const createCustomerSpy = vi.spyOn(subscriptionGateway, "createCustomer")

		const input = {
			name: "Single Provision",
			email: "single@customer.test",
			password: "any_password",
		}

		await request(fastifyServer.server).post(UserRoutes.CREATE).send(input)
		await waitForCustomer(input.email)

		expect(createCustomerSpy).toHaveBeenCalledTimes(1)
		expect(createCustomerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				email: input.email,
				name: input.name,
			}),
		)
	})
})
