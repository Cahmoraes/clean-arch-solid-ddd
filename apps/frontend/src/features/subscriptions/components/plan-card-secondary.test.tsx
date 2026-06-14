import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { DemoPlan } from "@/features/subscriptions/schemas"
import { PlanCardSecondary } from "./plan-card-secondary"

const planMensal: DemoPlan = {
	id: "premium-mensal",
	name: "Premium Mensal",
	priceId: "price_demo_monthly",
	priceLabel: "R$ 49,90/mês",
	tagline: "Sem fidelidade",
	features: ["Check-ins ilimitados"],
}

describe("PlanCardSecondary", () => {
	test("exibe nome e preço do plano", () => {
		render(<PlanCardSecondary plan={planMensal} />)
		expect(screen.getByText("Premium Mensal")).toBeInTheDocument()
		expect(screen.getByText("R$ 49,90/mês")).toBeInTheDocument()
	})
	test("exibe tagline do plano", () => {
		render(<PlanCardSecondary plan={planMensal} />)
		expect(screen.getByText("Sem fidelidade")).toBeInTheDocument()
	})
	test("CTA aponta para /cadastro", () => {
		render(<PlanCardSecondary plan={planMensal} />)
		const link = screen.getByRole("link", { name: /assinar/i })
		expect(link).toHaveAttribute("href", "/cadastro")
	})
})
