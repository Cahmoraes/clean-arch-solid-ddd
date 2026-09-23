import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type {
	CreateSubscriptionUseCase,
	CreateSubscriptionUseCaseInput,
} from "./create-subscription.usecase"

const MONTHLY_PRICE_ID = "price_test_123"
const YEARLY_PRICE_ID = "price_test_yearly"

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-mensal-id",
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Tagline",
		features: [],
		isActive: true,
		stripePriceId: MONTHLY_PRICE_ID,
		...overrides,
	})
}

describe("CreateSubscription UseCase", () => {
	let sut: CreateSubscriptionUseCase
	let subscriptionGateway: TestingSubscriptionGateway
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		subscriptionRepository = repositories.subscriptionRepository
		planRepository = new InMemoryPlanRepository()
		await planRepository.save(makePlan())
		await planRepository.save(
			makePlan({
				id: "plan-anual-id",
				name: "Premium Anual",
				billingPeriod: "yearly",
				stripePriceId: YEARLY_PRICE_ID,
			}),
		)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		subscriptionGateway = new TestingSubscriptionGateway()
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(subscriptionGateway)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription)
	})

	afterEach(() => {
		vi.useRealTimers()
		container.restore()
	})

	const baseInput = (): CreateSubscriptionUseCaseInput => ({
		userId: "user-id-123",
		customerId: "cus_test_123",
		priceId: MONTHLY_PRICE_ID,
		paymentMethodId: "pm_test_visa_123",
	})

	test("Deve criar uma Subscription e retornar { subscriptionId, status }", async () => {
		const input = baseInput()

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const value = result.forceSuccess().value
		expect(value.subscriptionId).toMatch(/^sub_test_/)
		expect(value.status).toBe("active")

		const subscriptionSaved = await subscriptionRepository.ofCustomerId(
			input.customerId,
		)
		expect(subscriptionSaved?.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		)
		expect(subscriptionSaved?.userId).toBe(input.userId)
		expect(subscriptionSaved?.customerId).toBe(input.customerId)
		expect(subscriptionSaved?.billingSubscriptionId).toBe(value.subscriptionId)
		expect(subscriptionSaved?.status).toBe("active")
	})

	test("Deve gravar planId e período mensal a partir do plano resolvido pelo priceId", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-31T10:00:00.000Z"))

		const result = await sut.execute(baseInput())

		expect(result.isSuccess()).toBe(true)
		const saved = await subscriptionRepository.ofUserId("user-id-123")
		expect(saved?.planId).toBe("plan-mensal-id")
		expect(saved?.currentPeriodStart.toISOString()).toBe(
			"2026-01-31T10:00:00.000Z",
		)
		expect(saved?.currentPeriodEnd.toISOString()).toBe(
			"2026-02-28T10:00:00.000Z",
		)
		expect(saved?.cancelAtPeriodEnd).toBe(false)
	})

	test("Deve gravar período anual para plano yearly", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-03-10T10:00:00.000Z"))

		await sut.execute({ ...baseInput(), priceId: YEARLY_PRICE_ID })

		const saved = await subscriptionRepository.ofUserId("user-id-123")
		expect(saved?.planId).toBe("plan-anual-id")
		expect(saved?.currentPeriodEnd.toISOString()).toBe(
			"2027-03-10T10:00:00.000Z",
		)
	})

	test("Deve falhar com PlanNotFoundError e não chamar o gateway quando nenhum plano corresponde ao priceId", async () => {
		const createSpy = vi.spyOn(subscriptionGateway, "createSubscription")
		const attachSpy = vi.spyOn(
			subscriptionGateway,
			"attachPaymentMethodToCustomer",
		)

		const result = await sut.execute({
			...baseInput(),
			priceId: "price_unknown",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
		expect(createSpy).not.toHaveBeenCalled()
		expect(attachSpy).not.toHaveBeenCalled()
		expect(subscriptionRepository.data.size).toBe(0)
	})

	test("Deve falhar com ActiveSubscriptionAlreadyExistsError quando já existe assinatura ativa não vencida", async () => {
		await sut.execute(baseInput())
		const createSpy = vi.spyOn(subscriptionGateway, "createSubscription")

		const result = await sut.execute({
			...baseInput(),
			customerId: "cus_other",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(ActiveSubscriptionAlreadyExistsError)
		expect(createSpy).not.toHaveBeenCalled()
		expect(subscriptionRepository.data.size).toBe(1)
	})

	test("Deve tratar cancelamento agendado ainda dentro do período como ativa e recusar", async () => {
		const scheduled = Subscription.restore({
			id: "sub-scheduled",
			userId: "user-id-123",
			billingSubscriptionId: "sub_stripe_scheduled",
			customerId: "cus_test_123",
			status: "active",
			planId: "plan-mensal-id",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
			currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
			cancelAtPeriodEnd: true,
		})
		await subscriptionRepository.save(scheduled)

		const result = await sut.execute(baseInput())

		expect(result.value).toBeInstanceOf(ActiveSubscriptionAlreadyExistsError)
	})

	test("Deve encerrar a assinatura vencida e criar a nova com novo período", async () => {
		const expired = Subscription.restore({
			id: "sub-expired",
			userId: "user-id-123",
			billingSubscriptionId: "sub_stripe_expired",
			customerId: "cus_test_123",
			status: "active",
			planId: "plan-anual-id",
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
			currentPeriodStart: new Date("2025-01-01T00:00:00.000Z"),
			currentPeriodEnd: new Date("2025-02-01T00:00:00.000Z"),
			cancelAtPeriodEnd: true,
		})
		await subscriptionRepository.save(expired)

		const result = await sut.execute(baseInput())

		expect(result.isSuccess()).toBe(true)
		expect(expired.status).toBe("canceled")
		expect(expired.canceledAt?.toISOString()).toBe("2025-02-01T00:00:00.000Z")
		expect(subscriptionRepository.data.size).toBe(2)
		const active = await subscriptionRepository.ofUserId("user-id-123")
		expect(active?.id).not.toBe("sub-expired")
		expect(active?.planId).toBe("plan-mensal-id")
		expect(active?.cancelAtPeriodEnd).toBe(false)
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

	test("Review Focus: priceId de plano inativado é recusado como plano não encontrado, sem chamar o gateway", async () => {
		await planRepository.update(makePlan().inactivate())
		const createSpy = vi.spyOn(subscriptionGateway, "createSubscription")
		const attachSpy = vi.spyOn(
			subscriptionGateway,
			"attachPaymentMethodToCustomer",
		)

		const result = await sut.execute(baseInput())

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
		expect(createSpy).not.toHaveBeenCalled()
		expect(attachSpy).not.toHaveBeenCalled()
		expect(subscriptionRepository.data.size).toBe(0)
	})
})
