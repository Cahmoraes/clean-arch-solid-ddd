import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { PlanNotFoundError } from "@/subscription/application/error/plan-not-found-error"
import { Plan } from "@/subscription/domain/plan"
import { InactivatePlanUseCase } from "./inactivate-plan.usecase"

describe("InactivatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: InactivatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new InactivatePlanUseCase(planRepository)
	})

	test("deve inativar um plano existente sem apagar seus dados", async () => {
		const plan = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		await planRepository.save(plan)

		const result = await sut.execute(plan.id)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.isActive).toBe(false)
		const stillPersisted = await planRepository.planOfId(plan.id)
		expect(stillPersisted).not.toBeNull()
		expect(stillPersisted?.name).toBe("Premium Mensal")
	})

	test("deve retornar PlanNotFoundError para um id inexistente", async () => {
		const result = await sut.execute("id-inexistente")

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
	})
})
