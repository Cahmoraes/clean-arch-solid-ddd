import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { Plan } from "@/subscription/domain/plan"
import { ListPlansAdminUseCase } from "./list-plans-admin.usecase"

describe("ListPlansAdminUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: ListPlansAdminUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new ListPlansAdminUseCase(planRepository)
	})

	test("deve retornar todos os planos, ativos e inativos", async () => {
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

		expect(result).toHaveLength(2)
		expect(result.map((plan) => plan.isActive).sort()).toEqual([false, true])
	})

	test("deve retornar lista vazia quando não há planos cadastrados", async () => {
		const result = await sut.execute()

		expect(result).toEqual([])
	})
})
