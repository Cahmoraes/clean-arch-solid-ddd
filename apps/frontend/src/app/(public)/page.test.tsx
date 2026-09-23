import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { SERVER_API_URL } from "@/lib/server-api-url"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import LandingPage from "./page"

const apiBaseUrl = SERVER_API_URL

const STUB_PLANS: Plan[] = [
	{
		id: "plan-mensal",
		name: "Premium Mensal",
		priceId: "price_demo_monthly",
		priceLabel: "R$ 49,90/mês",
		tagline: "Tagline mensal.",
		features: ["Check-ins ilimitados"],
	},
	{
		id: "plan-anual",
		name: "Premium Anual",
		priceId: "price_demo_yearly",
		priceLabel: "R$ 479,00/ano",
		tagline: "Tagline anual.",
		features: ["Tudo do mensal"],
	},
]

describe("Landing pública (RSC)", () => {
	test("renderiza CTAs de cadastro e login", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
		renderWithProviders(await LandingPage())
		const signup = screen.getByTestId("cta-signup")
		const login = screen.getByTestId("cta-login")
		expect(signup).toHaveAttribute("href", "/cadastro")
		expect(login).toHaveAttribute("href", "/login")
	})

	test("renderiza título principal e descrição", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
		renderWithProviders(await LandingPage())
		expect(
			screen.getByRole("heading", { level: 1, name: /acesso a academias/i }),
		).toBeInTheDocument()
		expect(screen.getByText(/encontre academias próximas/i)).toBeInTheDocument()
	})

	test("quando GET /plans falha, a seção de planos não é renderizada (sem fallback local)", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)
		renderWithProviders(await LandingPage())
		expect(screen.queryByText("Escolha seu plano")).not.toBeInTheDocument()
	})
})
