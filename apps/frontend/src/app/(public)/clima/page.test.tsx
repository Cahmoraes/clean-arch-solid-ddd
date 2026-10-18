import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { makeWeatherStub } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import WeatherPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}))

vi.mock("@/features/weather/components/weather-globe-error-boundary", () => ({
	WeatherGlobe: ({
		latitude,
		longitude,
	}: {
		latitude?: number
		longitude?: number
	}) => (
		<div
			aria-hidden="true"
			data-testid="weather-globe"
			data-latitude={latitude ?? ""}
			data-longitude={longitude ?? ""}
		/>
	),
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
				HttpResponse.json(makeWeatherStub("São Paulo"), { status: 200 }),
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

	test("AC-07: mostra mensagem de serviço indisponível quando a API retorna 503", async () => {
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
		expect(
			screen.queryByRole("heading", { name: "Próximas horas" }),
		).not.toBeInTheDocument()
		expect(screen.queryByText("Sensação")).not.toBeInTheDocument()
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
				return HttpResponse.json(makeWeatherStub("São Paulo"), { status: 200 })
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

	test("renderiza o WeatherGlobe acima do formulário de busca sem regressão no fluxo existente", async () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=São Paulo") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(makeWeatherStub("São Paulo"), { status: 200 }),
			),
		)

		renderWithProviders(<WeatherPage />)

		const globe = await screen.findByTestId("weather-globe")
		expect(globe).toBeInTheDocument()
		expect(screen.getByTestId("weather-globe-slot")).toBeInTheDocument()
		expect(await screen.findByText("24°C")).toBeInTheDocument()
		expect(screen.getByText("São Paulo")).toBeInTheDocument()
		expect(globe).toHaveAttribute("data-latitude", "-23.5505")
		expect(globe).toHaveAttribute("data-longitude", "-46.6333")
	})

	test("renderiza o globo sem coordenadas quando ainda não houve busca", () => {
		renderWithProviders(<WeatherPage />)

		const globe = screen.getByTestId("weather-globe")
		expect(globe).toHaveAttribute("data-latitude", "")
		expect(globe).toHaveAttribute("data-longitude", "")
	})

	test("renderiza o globo sem coordenadas quando a busca falha", async () => {
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

		await screen.findByRole("alert")
		const globe = screen.getByTestId("weather-globe")
		expect(globe).toHaveAttribute("data-latitude", "")
		expect(globe).toHaveAttribute("data-longitude", "")
	})

	function setUrl(query: string) {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams(query) as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
	}

	function mockReplace() {
		const replaceMock = vi.fn()
		vi.mocked(useRouter).mockReturnValue({
			replace: replaceMock,
		} as unknown as ReturnType<typeof useRouter>)
		return replaceMock
	}

	function countWeatherRequests() {
		const counter = { requests: 0 }
		server.use(
			http.get(`${apiBaseUrl}/weather`, () => {
				counter.requests += 1
				return HttpResponse.json(makeWeatherStub("São Paulo"))
			}),
		)
		return counter
	}

	test("AC-03: deve mostrar 24 °C como 75,2 °F e 12 km/h como 7 mph com ?units=imperial", async () => {
		setUrl("city=São Paulo&units=imperial")
		renderWithProviders(<WeatherPage />)

		expect(await screen.findByText("75,2°F")).toBeInTheDocument()
		expect(screen.getByText("7 mph NE")).toBeInTheDocument()
	})

	test("AC-09: deve mostrar °C e km/h quando units é inválido ou ausente", async () => {
		for (const query of ["city=São Paulo&units=banana", "city=São Paulo"]) {
			setUrl(query)
			const { unmount } = renderWithProviders(<WeatherPage />)

			expect(await screen.findByText("24°C")).toBeInTheDocument()
			expect(screen.getByText("12 km/h NE")).toBeInTheDocument()
			expect(
				screen.getByRole("button", { name: "Mudar para °F e mph" }),
			).toHaveAttribute("aria-pressed", "false")
			unmount()
		}
	})

	test("AC-06: deve adicionar units=imperial à URL ao alternar, sem nova requisição", async () => {
		const user = userEvent.setup()
		const replaceMock = mockReplace()
		setUrl("city=São Paulo")
		const counter = countWeatherRequests()
		renderWithProviders(<WeatherPage />)

		await user.click(
			await screen.findByRole("button", { name: "Mudar para °F e mph" }),
		)

		expect(replaceMock).toHaveBeenCalledWith(
			"?city=S%C3%A3o+Paulo&units=imperial",
		)
		expect(counter.requests).toBe(1)
	})

	test("AC-06: deve remover units da URL ao voltar para o métrico, sem nova requisição", async () => {
		const user = userEvent.setup()
		const replaceMock = mockReplace()
		setUrl("city=São Paulo&units=imperial")
		const counter = countWeatherRequests()
		renderWithProviders(<WeatherPage />)

		await user.click(
			await screen.findByRole("button", { name: "Mudar para °C e km/h" }),
		)

		expect(replaceMock).toHaveBeenCalledWith("?city=S%C3%A3o+Paulo")
		expect(counter.requests).toBe(1)
	})

	test("AC-10: deve exibir o crédito à Open-Meteo com link quando o resultado aparece", async () => {
		setUrl("city=São Paulo")
		renderWithProviders(<WeatherPage />)

		const link = await screen.findByRole("link", { name: "Open-Meteo" })
		expect(link).toHaveAttribute("href", "https://open-meteo.com/")
		expect(link.parentElement?.textContent).toBe(
			"Dados: Open-Meteo (CC BY 4.0)",
		)
	})

	test("deve mostrar agora, próximas horas e próximos 7 dias juntos", async () => {
		setUrl("city=São Paulo")
		renderWithProviders(<WeatherPage />)

		await screen.findByText("24°C")
		expect(
			screen.getByRole("heading", { name: "Próximas horas" }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { name: "Próximos 7 dias" }),
		).toBeInTheDocument()
		expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(31)
	})

	test("deve anunciar a temperatura na unidade ativa", async () => {
		setUrl("city=São Paulo&units=imperial")
		renderWithProviders(<WeatherPage />)

		expect(
			await screen.findByText("Temperatura de São Paulo: 75,2 graus"),
		).toBeInTheDocument()
	})

	test("Review Focus: alternar a unidade mantém city na URL", async () => {
		const user = userEvent.setup()
		const replaceMock = mockReplace()
		setUrl("city=São Paulo")
		renderWithProviders(<WeatherPage />)

		await user.click(
			await screen.findByRole("button", { name: "Mudar para °F e mph" }),
		)

		const params = new URLSearchParams(
			String(replaceMock.mock.calls[0][0]).replace(/^\?/, ""),
		)
		expect(params.get("city")).toBe("São Paulo")
		expect(params.get("units")).toBe("imperial")
	})

	test("Review Focus: consultar outra cidade mantém units na URL", async () => {
		const user = userEvent.setup()
		const replaceMock = mockReplace()
		setUrl("city=São Paulo&units=imperial")
		renderWithProviders(<WeatherPage />)
		await screen.findByText("75,2°F")

		await user.clear(screen.getByLabelText("Cidade (obrigatório)"))
		await user.type(screen.getByLabelText("Cidade (obrigatório)"), "Curitiba")
		await user.click(screen.getByRole("button", { name: "Consultar" }))

		const params = new URLSearchParams(
			String(replaceMock.mock.calls[0][0]).replace(/^\?/, ""),
		)
		expect(params.get("city")).toBe("Curitiba")
		expect(params.get("units")).toBe("imperial")
	})

	test("renderiza o globo antes do formulário de busca na ordem do DOM", () => {
		renderWithProviders(<WeatherPage />)

		const slot = screen.getByTestId("weather-globe-slot")
		const form = screen.getByLabelText("Cidade (obrigatório)").closest("form")

		// `querySelectorAll` devolve os nós em ordem de documento: o slot do globo
		// precisa vir antes do formulário de busca.
		expect(
			Array.from(
				document.querySelectorAll('[data-testid="weather-globe-slot"], form'),
			),
		).toEqual([slot, form])
	})
})
