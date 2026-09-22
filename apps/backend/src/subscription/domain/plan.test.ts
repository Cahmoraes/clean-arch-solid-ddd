import { describe, expect, test } from "vitest"
import { InvalidPlanNameError } from "./error/invalid-plan-name-error"
import { InvalidPriceError } from "./error/invalid-price-error"
import { Plan } from "./plan"

const VALID_PROPS = {
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly" as const,
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados", "Suporte prioritário"],
}

describe("Plan", () => {
	test("deve criar um Plan com dados válidos e isActive true por padrão", () => {
		const result = Plan.create(VALID_PROPS)

		expect(result.isSuccess()).toBe(true)
		const plan = result.forceSuccess().value
		expect(plan.name).toBe("Premium Mensal")
		expect(plan.priceCents).toBe(4990)
		expect(plan.billingPeriod).toBe("monthly")
		expect(plan.tagline).toBe(VALID_PROPS.tagline)
		expect(plan.features).toEqual(VALID_PROPS.features)
		expect(plan.isActive).toBe(true)
		expect(plan.stripePriceId).toBe("")
		expect(typeof plan.id).toBe("string")
		expect(plan.id.length).toBeGreaterThan(0)
	})

	test("deve rejeitar nome vazio com InvalidPlanNameError", () => {
		const result = Plan.create({ ...VALID_PROPS, name: "" })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPlanNameError)
	})

	test("deve rejeitar nome contendo apenas espaços com InvalidPlanNameError", () => {
		const result = Plan.create({ ...VALID_PROPS, name: "   " })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPlanNameError)
	})

	test("deve rejeitar priceCents negativo com InvalidPriceError", () => {
		const result = Plan.create({ ...VALID_PROPS, priceCents: -1 })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPriceError)
	})

	test("priceCents igual a 0 é um plano gratuito válido, não deve ser rejeitado", () => {
		const result = Plan.create({ ...VALID_PROPS, priceCents: 0 })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.priceCents).toBe(0)
	})

	test("inactivate() retorna uma nova instância com isActive false, preservando os demais campos", () => {
		const plan = Plan.create(VALID_PROPS).forceSuccess().value

		const inactivated = plan.inactivate()

		expect(inactivated).not.toBe(plan)
		expect(inactivated.isActive).toBe(false)
		expect(plan.isActive).toBe(true)
		expect(inactivated.name).toBe(plan.name)
		expect(inactivated.id).toBe(plan.id)
	})

	test("reactivate() retorna uma nova instância com isActive true", () => {
		const plan = Plan.create(VALID_PROPS).forceSuccess().value
		const inactivated = plan.inactivate()

		const reactivated = inactivated.reactivate()

		expect(reactivated).not.toBe(inactivated)
		expect(reactivated.isActive).toBe(true)
	})
})
