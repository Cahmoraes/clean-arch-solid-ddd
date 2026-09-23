import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { Plan } from "@/subscription/domain/plan"
import { UpdatePlanUseCase } from "./update-plan.usecase"

const VALID_INPUT = {
	name: "Premium Mensal Editado",
	priceCents: 5990,
	billingPeriod: "monthly" as const,
	tagline: "Nova tagline.",
	features: ["Check-ins ilimitados", "Novo benefício"],
}

describe("UpdatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: UpdatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new UpdatePlanUseCase(planRepository)
	})

	test("deve editar nome, preço, periodicidade, tagline e features de um plano existente", async () => {
		const existing = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline antiga.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		await planRepository.save(existing)

		const result = await sut.execute(existing.id, VALID_INPUT)

		expect(result.isSuccess()).toBe(true)
		const updated = result.forceSuccess().value
		expect(updated.name).toBe("Premium Mensal Editado")
		expect(updated.priceCents).toBe(5990)
		expect(updated.tagline).toBe("Nova tagline.")
		expect(updated.features).toEqual(["Check-ins ilimitados", "Novo benefício"])
	})

	test("PUT nunca altera isActive — plano inativado permanece inativado após editar", async () => {
		const inactivated = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline antiga.",
			features: ["Check-ins ilimitados"],
		})
			.forceSuccess()
			.value.inactivate()
		await planRepository.save(inactivated)

		const result = await sut.execute(inactivated.id, VALID_INPUT)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.isActive).toBe(false)
	})

	test("id inexistente retorna failure(PlanNotFoundError)", async () => {
		const result = await sut.execute("id-inexistente", VALID_INPUT)

		expect(result.isFailure()).toBe(true)
	})

	test("nome vazio retorna failure(InvalidPlanNameError)", async () => {
		const existing = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline antiga.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		await planRepository.save(existing)

		const result = await sut.execute(existing.id, { ...VALID_INPUT, name: "" })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPlanNameError)
	})

	test("preço negativo retorna failure(InvalidPriceError)", async () => {
		const existing = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline antiga.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		await planRepository.save(existing)

		const result = await sut.execute(existing.id, {
			...VALID_INPUT,
			priceCents: -1,
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPriceError)
	})
})
