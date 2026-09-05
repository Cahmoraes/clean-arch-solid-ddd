import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import WeatherPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}))

// O boundary real é usado de propósito aqui: só o módulo do globo é substituído
// por um que lança em tempo de render, reproduzindo a falha do chunk/Three.js.
vi.mock("@/features/weather/components/weather-globe", () => ({
	WeatherGlobe: () => {
		throw new Error("falha simulada no WeatherGlobe")
	},
}))

describe("WeatherPage com o globo falhando em tempo de render", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.mocked(useRouter).mockReturnValue({
			replace: vi.fn(),
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=São Paulo") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{
						city: "São Paulo",
						temperature: { current: 24, min: 18, max: 27 },
						latitude: -23.5505,
						longitude: -46.6333,
					},
					{ status: 200 },
				),
			),
		)
	})

	test("mostra o fallback estático do globo e mantém CurrentWeatherDisplay na tela", async () => {
		renderWithProviders(<WeatherPage />)

		expect(
			await screen.findByTestId("weather-globe-fallback"),
		).toBeInTheDocument()
		expect(await screen.findByText("24°C")).toBeInTheDocument()
		expect(screen.getByText("São Paulo")).toBeInTheDocument()
	})
})
