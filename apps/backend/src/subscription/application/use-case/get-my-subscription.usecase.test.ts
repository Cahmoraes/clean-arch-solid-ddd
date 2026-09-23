import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import type { GetMySubscriptionUseCase } from "./get-my-subscription.usecase"

const NOW = new Date("2026-01-15T00:00:00.000Z")

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-1",
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
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("GetMySubscription UseCase", () => {
	let sut: GetMySubscriptionUseCase
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository

	beforeEach(() => {
		container.snapshot()
		subscriptionRepository = setupInMemoryRepositories().subscriptionRepository
		planRepository = new InMemoryPlanRepository()
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.GetMySubscription)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve devolver null quando o usuário não tem assinatura (resultado normal, não erro)", async () => {
		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toBeNull()
	})

	test("Deve devolver a assinatura ativa com plano embutido, período e cancelAtPeriodEnd", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value).toEqual({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
			currentPeriodStart: "2026-01-01T00:00:00.000Z",
			currentPeriodEnd: "2026-02-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
		})
	})

	test("Deve devolver cancel_scheduled quando o cancelamento está agendado e o período não venceu", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const result = await sut.execute({ userId: "user-1" }, NOW)

		const view = result.forceSuccess().value
		expect(view?.state).toBe("cancel_scheduled")
		expect(view?.cancelAtPeriodEnd).toBe(true)
	})

	test("Deve devolver expired quando o cancelamento agendado já passou do fim do período, sem job externo", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const result = await sut.execute(
			{ userId: "user-1" },
			new Date("2026-02-01T00:00:00.000Z"),
		)

		expect(result.forceSuccess().value?.state).toBe("expired")
	})

	test("Deve devolver o plano mesmo quando ele foi inativado no catálogo", async () => {
		await planRepository.save(makePlan().inactivate())
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value?.plan).toEqual({
			id: "plan-1",
			name: "Premium Mensal",
			priceId: "price_monthly",
		})
	})

	test("Deve devolver plan null para assinatura legada sem plano vinculado", async () => {
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const result = await sut.execute({ userId: "user-1" }, NOW)

		const view = result.forceSuccess().value
		expect(view).not.toBeNull()
		expect(view?.plan).toBeNull()
	})

	test("Deve ignorar assinaturas de outros usuários", async () => {
		await subscriptionRepository.save(makeSubscription({ userId: "user-2" }))

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value).toBeNull()
	})
})
