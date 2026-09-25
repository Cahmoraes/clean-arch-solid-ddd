import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import { SERVER_API_URL } from "@/lib/server-api-url"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import LandingPage from "./page"

describe("LandingPage — identidade Replaced", () => {
	test("CTAs levam a cadastro e login, ambos com pixel-hover", async () => {
		const { getByTestId } = renderWithProviders(await LandingPage())
		const signup = getByTestId("cta-signup")
		const login = getByTestId("cta-login")
		expect(signup).toHaveAttribute("href", "/cadastro")
		expect(signup).toHaveClass("pixel-hover")
		expect(login).toHaveAttribute("href", "/login")
		expect(login).toHaveClass("pixel-hover")
	})

	test("exibe o hero novo e não exibe os textos da identidade antiga", async () => {
		const { getByRole, getByText, queryByText } = renderWithProviders(
			await LandingPage(),
		)
		expect(
			getByRole("heading", { level: 1, name: /qualquer academia/i }),
		).toBeInTheDocument()
		expect(getByText(/um plano, centenas de academias/i)).toBeInTheDocument()
		expect(queryByText(/Ollama/i)).toBeNull()
		expect(queryByText("Demo monocromática")).toBeNull()
	})

	test("exibe os 3 cards de features novos", async () => {
		const { getByText } = renderWithProviders(await LandingPage())
		expect(getByText("Encontre")).toBeInTheDocument()
		expect(getByText("Faça check-in")).toBeInTheDocument()
		expect(getByText("Mantenha a sequência")).toBeInTheDocument()
	})

	test("exibe a cena sunset no hero", async () => {
		const { container } = renderWithProviders(await LandingPage())
		expect(container.querySelector('[data-scene="sunset"]')).not.toBeNull()
	})

	test("quando a API de planos responde erro de rede, a seção Escolha seu plano some", async () => {
		server.use(http.get(`${SERVER_API_URL}/plans`, () => HttpResponse.error()))
		const { queryByText } = renderWithProviders(await LandingPage())
		expect(queryByText("Escolha seu plano")).toBeNull()
	})

	test("quando a API de planos responde HTTP 500, a seção Escolha seu plano some", async () => {
		server.use(
			http.get(`${SERVER_API_URL}/plans`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)
		const { queryByText } = renderWithProviders(await LandingPage())
		expect(queryByText("Escolha seu plano")).toBeNull()
	})
})
