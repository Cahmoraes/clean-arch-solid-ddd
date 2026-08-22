import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

describe("WeatherPage", () => {
	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue({
			replace: vi.fn(),
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
	})

	test("mostra o EmptyState quando não há ?city= na URL", () => {
		renderWithProviders(<WeatherPage />)

		expect(
			screen.getByText("Digite uma cidade para começar"),
		).toBeInTheDocument()
	})

	test("chama router.replace com ?city= ao submeter uma cidade", async () => {
		const user = userEvent.setup()
		const replaceMock = vi.fn()
		vi.mocked(useRouter).mockReturnValue({
			replace: replaceMock,
		} as unknown as ReturnType<typeof useRouter>)
		renderWithProviders(<WeatherPage />)

		await user.type(screen.getByLabelText("Cidade (obrigatório)"), "São Paulo")
		await user.click(screen.getByRole("button", { name: "Consultar" }))

		expect(replaceMock).toHaveBeenCalledWith(
			expect.stringContaining("city=S%C3%A3o+Paulo"),
		)
	})

	test("mostra CurrentWeatherDisplay quando a URL já tem ?city= e a consulta é bem sucedida", async () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=São Paulo") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{ city: "São Paulo", temperature: { current: 24, min: 18, max: 27 } },
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<WeatherPage />)

		await waitFor(() => expect(screen.getByText("24°C")).toBeInTheDocument())
		expect(screen.getByText("São Paulo")).toBeInTheDocument()
	})

	test("mostra mensagem de cidade não encontrada quando a API retorna 404", async () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=Atlantis") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{ code: "city_not_found", message: "City not found" },
					{ status: 404 },
				),
			),
		)

		renderWithProviders(<WeatherPage />)

		expect(
			await screen.findByText(
				"Cidade não encontrada. Verifique o nome e tente novamente.",
			),
		).toBeInTheDocument()
	})

	test("mostra mensagem de serviço indisponível quando a API retorna 503", async () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=São Paulo") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{
						code: "weather_provider_unavailable",
						message: "Weather provider unavailable",
					},
					{ status: 503 },
				),
			),
		)

		renderWithProviders(<WeatherPage />)

		expect(
			await screen.findByText(
				"Serviço de meteorologia indisponível no momento. Tente novamente em instantes.",
			),
		).toBeInTheDocument()
	})

	test("bloqueia nova submissão enquanto uma consulta está em andamento", async () => {
		const user = userEvent.setup()
		const replaceMock = vi.fn()
		vi.mocked(useRouter).mockReturnValue({
			replace: replaceMock,
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=São Paulo") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)

		let resolveRequest: (() => void) | undefined
		const requestPending = new Promise<void>((resolve) => {
			resolveRequest = resolve
		})
		server.use(
			http.get(`${apiBaseUrl}/weather`, async () => {
				await requestPending
				return HttpResponse.json(
					{
						city: "São Paulo",
						temperature: { current: 24, min: 18, max: 27 },
					},
					{ status: 200 },
				)
			}),
		)

		renderWithProviders(<WeatherPage />)

		const consultingButton = screen.getByRole("button", {
			name: "Consultando…",
		})
		await waitFor(() => expect(consultingButton).toBeDisabled())

		await user.clear(screen.getByLabelText("Cidade (obrigatório)"))
		await user.type(screen.getByLabelText("Cidade (obrigatório)"), "Curitiba")
		await user.keyboard("{Enter}")

		expect(replaceMock).not.toHaveBeenCalled()

		resolveRequest?.()
	})
})
