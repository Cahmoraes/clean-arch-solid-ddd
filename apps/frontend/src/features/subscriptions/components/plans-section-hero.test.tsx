import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { PlansSectionHero } from "./plans-section-hero"

const PLAN_A: Plan = {
	id: "plan-recem-criado",
	name: "Plano A",
	priceId: "price_a",
	priceLabel: "R$ 30,00/mês",
	tagline: "Tagline A.",
	features: ["Feature A"],
}

const PLAN_B: Plan = {
	id: "plan-mais-caro",
	name: "Plano B",
	priceId: "price_b",
	priceLabel: "R$ 300,00/ano",
	tagline: "Tagline B.",
	features: ["Feature B"],
}

describe("PlansSectionHero", () => {
	test("destaca o plano de maior preço, mesmo sendo o primeiro id na lista (não depende de slug fixo)", () => {
		render(<PlansSectionHero plans={[PLAN_A, PLAN_B]} />)

		expect(
			screen.getByTestId(`plan-card-hero-${PLAN_B.id}`),
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`plan-card-secondary-${PLAN_A.id}`),
		).toBeInTheDocument()
	})

	test("retorna null quando a lista de planos está vazia", () => {
		const { container } = render(<PlansSectionHero plans={[]} />)

		expect(container).toBeEmptyDOMElement()
	})
})
