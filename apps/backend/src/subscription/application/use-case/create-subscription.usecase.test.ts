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

	const baseInput = (): CreateSubscriptionUseCaseInput => ({
		userId: "user-id-123",
		customerId: "cus_test_123",
		priceId: "price_test_123",
		paymentMethodId: "pm_test_visa_123",
	})

	test("Deve criar uma Subscription e retornar { subscriptionId, status }", async () => {
		const input = baseInput()

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const value = result.forceSuccess().value
		expect(value.subscriptionId).toMatch(/^sub_test_/)
		expect(value.status).toBe("active")

		const subscriptionSaved = await subscriptionRepository.ofUserId(
			input.userId,
		)
		expect(subscriptionSaved?.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		)
		expect(subscriptionSaved?.userId).toBe(input.userId)
		expect(subscriptionSaved?.customerId).toBe(input.customerId)
		expect(subscriptionSaved?.billingSubscriptionId).toBe(value.subscriptionId)
		expect(subscriptionSaved?.status).toBe("active")
	})

	test("Deve falhar quando o gateway falhar no attachPaymentMethodToCustomer", async () => {
		const error = new Error("attach failed")
		subscriptionGateway.attachPaymentMethodToCustomer = async () => {
			throw error
		}

		const result = await sut.execute(baseInput())

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBe(error)
		expect(subscriptionRepository.data.size).toBe(0)
	})

	test("Deve falhar quando o gateway falhar no createSubscription", async () => {
		const error = new Error("create failed")
		subscriptionGateway.createSubscription = async () => {
			throw error
		}

		const result = await sut.execute(baseInput())

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBe(error)
		expect(subscriptionRepository.data.size).toBe(0)
	})
})
