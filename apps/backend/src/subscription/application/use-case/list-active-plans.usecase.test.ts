import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { Plan } from "@/subscription/domain/plan"
import { ListActivePlansUseCase } from "./list-active-plans.usecase"

describe("ListActivePlansUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: ListActivePlansUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new ListActivePlansUseCase(planRepository)
	})

	test("deve retornar apenas planos ativos", async () => {
		const active = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		const inactive = Plan.create({
			name: "Premium Anual",
			priceCents: 47900,
			billingPeriod: "yearly",
			tagline: "Tagline anual.",
			features: ["Tudo do mensal"],
		})
			.forceSuccess()
			.value.inactivate()
		await planRepository.save(active)
		await planRepository.save(inactive)

		const result = await sut.execute()

		expect(result).toHaveLength(1)
		expect(result[0]?.name).toBe("Premium Mensal")
	})
})
