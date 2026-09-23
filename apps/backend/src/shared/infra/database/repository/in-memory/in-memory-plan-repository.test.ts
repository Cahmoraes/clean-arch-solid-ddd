import { beforeEach, describe, expect, test } from "vitest"
import { Plan } from "@/subscription/domain/plan"
import { InMemoryPlanRepository } from "./in-memory-plan-repository"

function makePlan(overrides: Partial<Parameters<typeof Plan.create>[0]> = {}) {
	return Plan.create({
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Acesso ilimitado.",
		features: ["Check-ins ilimitados"],
		...overrides,
	}).forceSuccess().value
}

describe("InMemoryPlanRepository", () => {
	let sut: InMemoryPlanRepository

	beforeEach(() => {
		sut = new InMemoryPlanRepository()
	})

	test("deve salvar e buscar um plano por id", async () => {
		const plan = makePlan()

		await sut.save(plan)
		const found = await sut.planOfId(plan.id)

		expect(found).not.toBeNull()
		expect(found?.id).toBe(plan.id)
		expect(found?.name).toBe("Premium Mensal")
	})

	test("planOfId retorna null quando o plano não existe", async () => {
		const found = await sut.planOfId("id-inexistente")

		expect(found).toBeNull()
	})

	test("fetchActivePlans retorna apenas planos com isActive true", async () => {
		const active = makePlan({ name: "Ativo" })
		const inactive = makePlan({ name: "Inativo" }).inactivate()
		await sut.save(active)
		await sut.save(inactive)

		const result = await sut.fetchActivePlans()

		expect(result).toHaveLength(1)
		expect(result[0]?.name).toBe("Ativo")
	})

	test("fetchPlans retorna todos os planos, ativos e inativos", async () => {
		const active = makePlan({ name: "Ativo" })
		const inactive = makePlan({ name: "Inativo" }).inactivate()
		await sut.save(active)
		await sut.save(inactive)

		const result = await sut.fetchPlans()

		expect(result).toHaveLength(2)
	})
})

describe("InMemoryPlanRepository.planOfStripePriceId", () => {
	function makePlan(
		overrides: Partial<Parameters<typeof Plan.restore>[0]> = {},
	) {
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

	it("encontra o plano pelo stripePriceId, inclusive inativo", async () => {
		const sut = new InMemoryPlanRepository()
		await sut.save(makePlan({ isActive: false }))

		const result = await sut.planOfStripePriceId("price_monthly")

		expect(result?.id).toBe("plan-1")
		expect(result?.isActive).toBe(false)
	})

	it("devolve null para price desconhecido e para priceId vazio", async () => {
		const sut = new InMemoryPlanRepository()
		await sut.save(makePlan({ stripePriceId: "" }))

		expect(await sut.planOfStripePriceId("price_unknown")).toBeNull()
		expect(await sut.planOfStripePriceId("")).toBeNull()
	})
})
