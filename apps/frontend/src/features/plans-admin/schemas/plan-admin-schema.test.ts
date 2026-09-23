import { describe, expect, test } from "vitest"
import { planAdminSchema } from "./plan-admin-schema"

const VALID_INPUT = {
	name: "Premium Mensal",
	price: 49.9,
	billingPeriod: "monthly" as const,
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados"],
	stripePriceId: "",
}

describe("planAdminSchema", () => {
	test("aceita dados válidos", () => {
		const result = planAdminSchema.safeParse(VALID_INPUT)

		expect(result.success).toBe(true)
	})

	test("rejeita nome vazio", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, name: "" })

		expect(result.success).toBe(false)
	})

	test("rejeita preço negativo", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, price: -1 })

		expect(result.success).toBe(false)
	})

	test("aceita preço igual a 0 (plano gratuito)", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, price: 0 })

		expect(result.success).toBe(true)
	})

	test("rejeita lista de features vazia", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, features: [] })

		expect(result.success).toBe(false)
	})

	test("rejeita billingPeriod fora de monthly/yearly", () => {
		const result = planAdminSchema.safeParse({
			...VALID_INPUT,
			billingPeriod: "weekly",
		})

		expect(result.success).toBe(false)
	})
})
