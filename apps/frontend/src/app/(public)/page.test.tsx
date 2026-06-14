import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import { DEMO_PLANS } from "@/features/subscriptions/schemas"
import { SERVER_API_URL } from "@/lib/server-api-url"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import LandingPage from "./page"

const apiBaseUrl = SERVER_API_URL

describe("Landing pública (RSC)", () => {
	test("renderiza CTAs de cadastro e login", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(DEMO_PLANS)),
		)
		renderWithProviders(await LandingPage())
		const signup = screen.getByTestId("cta-signup")
		const login = screen.getByTestId("cta-login")
		expect(signup).toHaveAttribute("href", "/cadastro")
		expect(login).toHaveAttribute("href", "/login")
	})

	test("renderiza título principal e descrição", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(DEMO_PLANS)),
		)
		renderWithProviders(await LandingPage())
		expect(
			screen.getByRole("heading", { level: 1, name: /acesso a academias/i }),
		).toBeInTheDocument()
		expect(screen.getByText(/encontre academias próximas/i)).toBeInTheDocument()
	})

	test("usa DEMO_PLANS como fallback quando GET /plans falha", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)
		renderWithProviders(await LandingPage())
		expect(screen.getByText("Escolha seu plano")).toBeInTheDocument()
		const featuredPlan =
			DEMO_PLANS.find((plan) => plan.id === "premium-anual") ?? DEMO_PLANS[0]
		expect(screen.getByText(featuredPlan.name)).toBeInTheDocument()
	})
})
