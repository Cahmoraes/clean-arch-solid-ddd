/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { UserNotFoundError } from "@/user/application/error/user-not-found-error"
import { User } from "@/user/domain/user"

import type {
	CreateCustomer,
	CreateCustomerInput,
} from "./create-customer.usecase"

describe("CreateCustomerUseCase", () => {
	let sut: CreateCustomer
	let userRepository: InMemoryUserRepository
	let subscriptionGateway: TestingSubscriptionGateway

	beforeEach(() => {
		container.snapshot()
		userRepository = setupInMemoryRepositories().userRepository
		subscriptionGateway = new TestingSubscriptionGateway()
		container
			.rebindSync(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(subscriptionGateway)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.CreateCustomer)
	})

	afterEach(() => {
		container.restore()
		subscriptionGateway.clearCustomers()
	})

	test("Deve criar um customer e associar a um usuário existente", async () => {
		const user = (
			await User.create({
				email: "caique@moraes.com.br",
				name: "Caique Moraes",
				password: "123456",
			})
		).force.success().value
		await userRepository.save(user)
		const savedUser = await userRepository.userOfEmail(user.email)
		const input: CreateCustomerInput = {
			email: user.email,
			name: user.name,
			metadata: { userId: user.id! },
		}
		const response = await sut.execute(input)
		const customer = response.force.success().value
		expect(customer).toEqual({
			id: savedUser?.billingCustomerId,
			userId: savedUser?.id,
			name: user.name,
			email: user.email,
		})
	})

	test("Não deve criar um customer para um usuário inexistente", async () => {
		const input: CreateCustomerInput = {
			email: "inexisting@mail.com",
			name: "Test User",
			metadata: { key: "value" },
		}
		const response = await sut.execute(input)
		expect(response.force.failure().value).toBeInstanceOf(UserNotFoundError)
	})
})
