import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "@/subscription/domain/error/no-active-subscription-error.js"
import { SubscriptionCancellationScheduledError } from "@/subscription/domain/error/subscription-cancellation-scheduled-error.js"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { ChangeSubscriptionPlanUseCase } from "./change-subscription-plan.usecase"

const NOW = new Date("2026-01-15T00:00:00.000Z")

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
		userId: "user-1",
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-mensal",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("ChangeSubscriptionPlan UseCase", () => {
	let sut: ChangeSubscriptionPlanUseCase
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository
	let gateway: TestingSubscriptionGateway

	beforeEach(async () => {
		container.snapshot()
		subscriptionRepository = setupInMemoryRepositories().subscriptionRepository
		planRepository = new InMemoryPlanRepository()
		await planRepository.save(makePlan())
		await planRepository.save(
			makePlan({
				id: "plan-anual",
				name: "Premium Anual",
				billingPeriod: "yearly",
				stripePriceId: "price_yearly",
			}),
		)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		gateway = new TestingSubscriptionGateway()
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(gateway)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve trocar o plano na mesma assinatura e trocar o price no gateway", async () => {
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			id: "sub-1",
			state: "active",
			plan: {
				id: "plan-anual",
				name: "Premium Anual",
				priceId: "price_yearly",
			},
		})
		expect(subscriptionRepository.data.size).toBe(1)
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.id).toBe("sub-1")
		expect(saved?.planId).toBe("plan-anual")
		expect(gateway.changedPrices).toEqual([
			{ billingSubscriptionId: "sub_stripe_1", priceId: "price_yearly" },
		])
	})

	test("Deve permitir a troca em assinatura legada sem plano, gravando o novo plano", async () => {
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.isSuccess()).toBe(true)
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.planId).toBe("plan-anual")
	})

	test("Deve falhar com PlanNotFoundError quando o priceId não corresponde a plano ativo", async () => {
		await subscriptionRepository.save(makeSubscription())
		await planRepository.update(
			makePlan({
				id: "plan-anual",
				stripePriceId: "price_yearly",
			}).inactivate(),
		)

		const unknown = await sut.execute(
			{ userId: "user-1", priceId: "price_unknown" },
			NOW,
		)
		const inactive = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(unknown.value).toBeInstanceOf(PlanNotFoundError)
		expect(inactive.value).toBeInstanceOf(PlanNotFoundError)
		expect(gateway.changedPrices).toEqual([])
	})

	test("Deve falhar com NoActiveSubscriptionError quando o usuário não tem assinatura", async () => {
		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
		expect(gateway.changedPrices).toEqual([])
	})

	test("Deve falhar com NoActiveSubscriptionError quando a assinatura já venceu", async () => {
		await subscriptionRepository.save(
			makeSubscription({
				cancelAtPeriodEnd: true,
				currentPeriodEnd: new Date("2026-01-10T00:00:00.000Z"),
			}),
		)

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
	})

	test("Deve falhar com SubscriptionCancellationScheduledError quando há cancelamento agendado e não chamar o gateway", async () => {
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.value).toBeInstanceOf(SubscriptionCancellationScheduledError)
		expect(gateway.changedPrices).toEqual([])
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.planId).toBe("plan-mensal")
	})

	test("Review Focus: falha do gateway na troca devolve o erro e mantém o planId local inalterado", async () => {
		await subscriptionRepository.save(makeSubscription())
		const gatewayError = new Error("stripe indisponível")
		gateway.failPriceChangeWith(gatewayError)

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBe(gatewayError)
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.planId).toBe("plan-mensal")
		expect(saved?.updatedAt).toBeUndefined()
	})
})
