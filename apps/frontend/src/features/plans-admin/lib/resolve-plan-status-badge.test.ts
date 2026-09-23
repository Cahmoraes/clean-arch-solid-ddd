import { describe, expect, test } from "vitest"
import type { PlanAdmin } from "@/features/plans-admin/api"
import { resolvePlanStatusBadge } from "./resolve-plan-status-badge"

function makePlan(overrides: Partial<PlanAdmin> = {}): PlanAdmin {
	return {
		id: "plan-1",
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Tagline.",
		features: ["Check-ins ilimitados"],
		isActive: true,
		stripePriceId: "",
		...overrides,
	}
}

describe("resolvePlanStatusBadge", () => {
	test("plano ativo retorna tone success e label Ativo", () => {
		const badge = resolvePlanStatusBadge(makePlan({ isActive: true }))

		expect(badge).toEqual({ tone: "success", label: "Ativo" })
	})

	test("plano inativo retorna tone neutral e label Inativo", () => {
		const badge = resolvePlanStatusBadge(makePlan({ isActive: false }))

		expect(badge).toEqual({ tone: "neutral", label: "Inativo" })
	})
})
