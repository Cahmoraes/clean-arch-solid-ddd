import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "@/subscription/domain/error/no-active-subscription-error.js"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import type { ScheduleSubscriptionCancellationUseCase } from "./schedule-subscription-cancellation.usecase"

const NOW = new Date("2026-01-15T00:00:00.000Z")

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

describe("ScheduleSubscriptionCancellation UseCase", () => {
	let sut: ScheduleSubscriptionCancellationUseCase
	let subscriptionRepository: InMemorySubscriptionRepository

	beforeEach(async () => {
		container.snapshot()
		subscriptionRepository = setupInMemoryRepositories().subscriptionRepository
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
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		sut = container.get(
			SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve agendar o cancelamento mantendo a assinatura ativa até o fim do período", async () => {
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			id: "sub-1",
			state: "cancel_scheduled",
			cancelAtPeriodEnd: true,
			currentPeriodEnd: "2026-02-01T00:00:00.000Z",
		})
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.status).toBe("active")
		expect(saved?.cancelAtPeriodEnd).toBe(true)
	})

	test("Deve ser idempotente: cancelar de novo mantém o estado agendado sem erro", async () => {
		await subscriptionRepository.save(makeSubscription())
		await sut.execute({ userId: "user-1" }, NOW)
		const updatedAtAfterFirst = (
			await subscriptionRepository.ofUserId("user-1")
		)?.updatedAt

		const second = await sut.execute(
			{ userId: "user-1" },
			new Date("2026-01-20T00:00:00.000Z"),
		)

		expect(second.isSuccess()).toBe(true)
		expect(second.forceSuccess().value.cancelAtPeriodEnd).toBe(true)
		expect(second.forceSuccess().value.state).toBe("cancel_scheduled")
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.updatedAt).toEqual(updatedAtAfterFirst)
	})

	test("Deve falhar com NoActiveSubscriptionError quando o usuário não tem assinatura", async () => {
		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
		expect((result.value as Error).message).toBe(
			"Você não possui assinatura ativa",
		)
	})

	test("Deve falhar com NoActiveSubscriptionError quando a assinatura já venceu", async () => {
		await subscriptionRepository.save(
			makeSubscription({
				cancelAtPeriodEnd: true,
				currentPeriodEnd: new Date("2026-01-10T00:00:00.000Z"),
			}),
		)

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
	})

	test("Deve devolver plan null para assinatura legada e ainda assim agendar o cancelamento", async () => {
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value.plan).toBeNull()
		expect(result.forceSuccess().value.cancelAtPeriodEnd).toBe(true)
	})
})
