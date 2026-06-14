import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { DemoPlan } from "@/features/subscriptions/schemas"
import { PlanCardHero } from "./plan-card-hero"

const planAnual: DemoPlan = {
	id: "premium-anual",
	name: "Premium Anual",
	priceId: "price_demo_yearly",
	priceLabel: "R$ 479,00/ano",
	tagline: "20% de economia comparado ao plano mensal.",
	features: [
		"Check-ins ilimitados",
		"Histórico completo",
		"Suporte prioritário",
	],
}

describe("PlanCardHero", () => {
	test("exibe nome, preço e tagline do plano", () => {
		render(<PlanCardHero plan={planAnual} />)
		expect(screen.getByText("Premium Anual")).toBeInTheDocument()
		expect(screen.getByText("R$ 479,00/ano")).toBeInTheDocument()
		expect(
			screen.getByText("20% de economia comparado ao plano mensal."),
		).toBeInTheDocument()
	})
	test("exibe todas as features com ícone de check", () => {
		render(<PlanCardHero plan={planAnual} />)
		for (const feature of planAnual.features) {
			expect(screen.getByText(feature)).toBeInTheDocument()
		}
	})
	test("exibe badge padrão 'Melhor valor'", () => {
		render(<PlanCardHero plan={planAnual} />)
		expect(screen.getByText("Melhor valor")).toBeInTheDocument()
	})
	test("exibe badge customizado quando badgeLabel é passado", () => {
		render(<PlanCardHero plan={planAnual} badgeLabel="Recomendado" />)
		expect(screen.getByText("Recomendado")).toBeInTheDocument()
	})
	test("CTA aponta para /cadastro", () => {
		render(<PlanCardHero plan={planAnual} />)
		const link = screen.getByRole("link", { name: /assinar agora/i })
		expect(link).toHaveAttribute("href", "/cadastro")
	})
})
