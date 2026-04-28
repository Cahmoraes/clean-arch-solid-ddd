/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"

import type {
	CreateSubscriptionUseCase,
	CreateSubscriptionUseCaseInput,
} from "./create-subscription.usecase"

describe("CreateSubscription UseCase", () => {
	let sut: CreateSubscriptionUseCase
	let subscriptionGateway: TestingSubscriptionGateway
	let subscriptionRepository: InMemorySubscriptionRepository

	beforeEach(() => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		subscriptionRepository = repositories.subscriptionRepository
		subscriptionGateway = new TestingSubscriptionGateway()
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(subscriptionGateway)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve criar uma Subscription", async () => {
		const input: CreateSubscriptionUseCaseInput = {
			userId: "user-id-123",
			customerId: "cus_test_123",
			priceId: "price_test_123",
		}

		await sut.execute(input)

		const subscriptionSaved = await subscriptionRepository.ofUserId(input.userId)
		expect(subscriptionSaved?.id).toBeDefined()
		expect(subscriptionSaved?.userId).toBe(input.userId)
		expect(subscriptionSaved?.customerId).toBe(input.customerId)
		expect(subscriptionSaved?.billingSubscriptionId).toMatch(/^sub_test_/)
		expect(subscriptionSaved?.status).toBe("active")
	})
})
