import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { PlanNotFoundError } from "@/subscription/application/error/plan-not-found-error"
import { Plan } from "@/subscription/domain/plan"
import { ReactivatePlanUseCase } from "./reactivate-plan.usecase"

describe("ReactivatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: ReactivatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new ReactivatePlanUseCase(planRepository)
	})

	test("deve reativar um plano previamente inativado", async () => {
		const inactivated = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		})
			.forceSuccess()
			.value.inactivate()
		await planRepository.save(inactivated)

		const result = await sut.execute(inactivated.id)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.isActive).toBe(true)
	})

	test("deve retornar PlanNotFoundError para um id inexistente", async () => {
		const result = await sut.execute("id-inexistente")

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
	})
})
