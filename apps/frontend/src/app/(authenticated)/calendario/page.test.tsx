import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import CalendarPage from "./page"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"

interface Deferred {
	promise: Promise<void>
	resolve: () => void
}

function createDeferred(): Deferred {
	let resolve: () => void = () => undefined
	const promise = new Promise<void>((res) => {
		resolve = res
	})
	return { promise, resolve }
}

describe("CalendarPage", () => {
	test("renderiza feriados nacionais e permite navegar para ano anterior e seguinte", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2025`, () =>
				HttpResponse.json([
					{
						date: "2025-09-07",
						name: "Natal",
						type: "national",
					},
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-09-07",
						name: "Tiradentes",
						type: "national",
					},
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2027`, () =>
				HttpResponse.json([
					{
						date: "2027-09-07",
						name: "Confraternização Universal",
						type: "national",
					},
				]),
			),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(
			screen.getByRole("heading", { name: "Calendário 2026" }),
		).toBeInTheDocument()
		expect((await screen.findAllByText("Tiradentes")).length).toBeGreaterThan(0)
		// single month rendered, not 12
		expect(
			screen.getByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("heading", { name: /Outubro 2026/ }),
		).not.toBeInTheDocument()

		await user.click(
			screen.getByRole("button", { name: "Ir para 2025 (ano anterior)" }),
		)

		expect(
			screen.getByRole("heading", { name: "Calendário 2025" }),
		).toBeInTheDocument()
		expect((await screen.findAllByText("Natal")).length).toBeGreaterThan(0)

		await user.click(
			screen.getByRole("button", { name: "Ir para 2026 (ano seguinte)" }),
		)

		expect(
			screen.getByRole("heading", { name: "Calendário 2026" }),
		).toBeInTheDocument()
		expect((await screen.findAllByText("Tiradentes")).length).toBeGreaterThan(0)

		await user.click(
			screen.getByRole("button", { name: "Ir para 2027 (ano seguinte)" }),
		)

		expect(
			screen.getByRole("heading", { name: "Calendário 2027" }),
		).toBeInTheDocument()
		expect(
			(await screen.findAllByText("Confraternização Universal")).length,
		).toBeGreaterThan(0)
	})

	test("botão Hoje restaura mês/ano atuais após navegação e fica desabilitado quando já está no atual", async () => {
		const currentYear = new Date().getFullYear()
		const currentMonth = new Date().getMonth()
		const currentMonthStr = String(currentMonth + 1).padStart(2, "0")
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/${currentYear}`, () =>
				HttpResponse.json([
					{
						date: `${currentYear}-${currentMonthStr}-07`,
						name: "Independência do Brasil",
						type: "national",
					},
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/${currentYear - 1}`, () =>
				HttpResponse.json([]),
			),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage />)

		await screen.findByRole("heading", { name: `Calendário ${currentYear}` })
		expect(screen.getByRole("button", { name: "Ir para hoje" })).toBeDisabled()

		await user.click(
			screen.getByRole("button", {
				name: `Ir para ${currentYear - 1} (ano anterior)`,
			}),
		)
		await screen.findByRole("heading", {
			name: `Calendário ${currentYear - 1}`,
		})
		expect(screen.getByRole("button", { name: "Ir para hoje" })).toBeEnabled()

		await user.click(screen.getByRole("button", { name: "Ir para hoje" }))

		expect(
			await screen.findByRole("heading", { name: `Calendário ${currentYear}` }),
		).toBeInTheDocument()
		expect(
			(await screen.findAllByText("Independência do Brasil")).length,
		).toBeGreaterThan(0)
		expect(screen.getByRole("button", { name: "Ir para hoje" })).toBeDisabled()
		// o botão "Hoje" desabilita a si mesmo após o clique; o foco deve ir
		// para um controle estável (ano anterior), nunca se perder
		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: `Ir para ${currentYear - 1} (ano anterior)`,
				}),
			).toHaveFocus()
		})
	})

	test("mostra ano atual como padrão quando initialYear não é informado", async () => {
		const currentYear = new Date().getFullYear()
		const month = new Date().getMonth()
		const monthStr = String(month + 1).padStart(2, "0")
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/${currentYear}`, () =>
				HttpResponse.json([
					{
						date: `${currentYear}-${monthStr}-07`,
						name: "Independência do Brasil",
						type: "national",
					},
				]),
			),
		)

		renderWithProviders(<CalendarPage />)

		expect(
			screen.getByRole("heading", { name: `Calendário ${currentYear}` }),
		).toBeInTheDocument()
		expect(
			(await screen.findAllByText("Independência do Brasil")).length,
		).toBeGreaterThan(0)
	})

	test("anuncia loading enquanto feriados carregam", async () => {
		const deferred = createDeferred()
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, async () => {
				await deferred.promise
				return HttpResponse.json([])
			}),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Carregando feriados",
		)
		expect(
			screen.queryByRole("heading", { name: "Feriados de 2026" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByText("Nenhum feriado encontrado"),
		).not.toBeInTheDocument()

		deferred.resolve()

		await waitFor(() => {
			expect(
				screen.queryByRole("status", { name: "Carregando feriados" }),
			).not.toBeInTheDocument()
		})
	})

	test("mostra erro recuperável quando feriados não carregam", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json({ message: "indisponível" }, { status: 503 }),
			),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(
			await screen.findByRole("alert", undefined, { timeout: 3_000 }),
		).toHaveTextContent("Não foi possível carregar os feriados")
		expect(
			screen.getByRole("button", { name: "Tentar novamente" }),
		).toBeEnabled()
		expect(
			screen.queryByRole("heading", { name: "Feriados de 2026" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByText("Nenhum feriado encontrado"),
		).not.toBeInTheDocument()
	})

	test("refaz consulta ao acionar retry após erro", async () => {
		let requestCount = 0
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => {
				requestCount += 1
				if (requestCount <= 2) {
					return HttpResponse.json({ message: "indisponível" }, { status: 503 })
				}
				return HttpResponse.json([
					{
						date: "2026-09-07",
						name: "Natal",
						type: "national",
					},
				])
			}),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		await screen.findByRole("alert", undefined, { timeout: 3_000 })
		await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

		expect((await screen.findAllByText("Natal")).length).toBeGreaterThan(0)
		expect(requestCount).toBe(3)
	})

	test("mostra estado vazio quando ano não tem feriados retornados", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([])),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(
			await screen.findByText("Nenhum feriado encontrado"),
		).toBeInTheDocument()
		expect(screen.getByText("Tente consultar outro ano.")).toBeInTheDocument()
		expect(
			screen.queryByRole("heading", { name: "Feriados de 2026" }),
		).not.toBeInTheDocument()
	})

	test("renderiza feriado destacado no mês correspondente", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-04-21",
						name: "Tiradentes",
						type: "national",
					},
				]),
			),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={3} />)

		expect(
			await screen.findByRole("heading", { name: /Abril 2026/ }),
		).toBeInTheDocument()
		expect(screen.getByLabelText(/21 de abril: Tiradentes/)).toBeInTheDocument()
		// garante mês único
		expect(
			screen.queryByRole("heading", { name: /Maio 2026/ }),
		).not.toBeInTheDocument()
	})

	test("exibe mês atual por padrão e navega com setas de mês com virada de ano", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-09-07",
						name: "Independência do Brasil",
						type: "national",
					},
					{
						date: "2026-10-12",
						name: "Nossa Senhora Aparecida",
						type: "national",
					},
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2027`, () =>
				HttpResponse.json([
					{
						date: "2027-01-01",
						name: "Confraternização Universal",
						type: "national",
					},
				]),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)
		expect(
			await screen.findByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()
		expect(
			within(screen.getByRole("complementary")).getByText(/Independência/),
		).toBeInTheDocument()
		await user.click(
			screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }),
		)
		expect(
			await screen.findByRole("heading", { name: /Outubro 2026/ }),
		).toBeInTheDocument()
		expect(
			within(screen.getByRole("complementary")).getByText(/Aparecida/),
		).toBeInTheDocument()
	})

	test("mantém pill de ano híbrido e aria-live ao trocar mês", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-09-07",
						name: "Independência do Brasil",
						type: "national",
					},
				]),
			),
		)
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)
		// pill híbrido
		expect(
			screen.getByRole("button", { name: /Ir para 2025/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Ir para 2027/ }),
		).toBeInTheDocument()
		// aria-live no título do mês
		const heading = await screen.findByRole("heading", {
			name: /Setembro 2026/,
		})
		expect(heading.closest("[aria-live='polite']")).toBeInTheDocument()
		// isFetching sr-only status after navigation not present initially
		expect(screen.queryByText(/Carregando feriados de/)).not.toBeInTheDocument()
	})

	test("navega de dezembro para janeiro com virada de ano e busca novo ano", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-12-25", name: "Natal", type: "national" },
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2027`, () =>
				HttpResponse.json([
					{
						date: "2027-01-01",
						name: "Confraternização Universal",
						type: "national",
					},
				]),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={11} />)

		expect(
			await screen.findByRole("heading", { name: /Dezembro 2026/ }),
		).toBeInTheDocument()
		expect(
			within(screen.getByRole("complementary")).getByText(/Natal/),
		).toBeInTheDocument()

		await user.click(
			screen.getByRole("button", { name: /Próximo mês, janeiro 2027/ }),
		)

		expect(
			await screen.findByRole("heading", { name: /Janeiro 2027/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { name: "Calendário 2027" }),
		).toBeInTheDocument()
		expect(
			within(screen.getByRole("complementary")).getByText(/Confraternização/),
		).toBeInTheDocument()
	})

	test("navega de janeiro para dezembro do ano anterior com virada", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-01-01",
						name: "Confraternização Universal",
						type: "national",
					},
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2025`, () =>
				HttpResponse.json([
					{ date: "2025-12-25", name: "Natal", type: "national" },
				]),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={0} />)

		expect(
			await screen.findByRole("heading", { name: /Janeiro 2026/ }),
		).toBeInTheDocument()

		await user.click(
			screen.getByRole("button", { name: /Mês anterior, dezembro 2025/ }),
		)

		expect(
			await screen.findByRole("heading", { name: /Dezembro 2025/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { name: "Calendário 2025" }),
		).toBeInTheDocument()
		expect(
			within(screen.getByRole("complementary")).getByText(/Natal/),
		).toBeInTheDocument()
	})

	test("navega via swipe horizontal e ignora swipe vertical (dy>30)", async () => {
		const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(max-width: 767px)",
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}))
		vi.stubGlobal("matchMedia", matchMediaMock)
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-09-07",
						name: "Independência do Brasil",
						type: "national",
					},
				]),
			),
		)
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)
		expect(
			await screen.findByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()

		const grid = screen.getByRole("complementary").parentElement as HTMLElement
		expect(grid).not.toBeNull()
		expect(grid.className).toContain("grid")

		// dx -90 (swipe left) => próximo mês, dy 5 dentro do limite 30
		fireEvent.touchStart(grid, {
			touches: [{ clientX: 100, clientY: 100 }],
		})
		fireEvent.touchEnd(grid, {
			changedTouches: [{ clientX: 10, clientY: 105 }],
		})

		expect(
			await screen.findByRole("heading", { name: /Outubro 2026/ }),
		).toBeInTheDocument()

		// dy 50 >30 deve ser ignorado, permanece em outubro
		fireEvent.touchStart(grid, {
			touches: [{ clientX: 100, clientY: 100 }],
		})
		fireEvent.touchEnd(grid, {
			changedTouches: [{ clientX: 10, clientY: 150 }],
		})

		expect(
			screen.getByRole("heading", { name: /Outubro 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("heading", { name: /Setembro 2026/ }),
		).not.toBeInTheDocument()
		vi.unstubAllGlobals()
	})

	test("navega via teclado ArrowLeft/Right", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-09-07",
						name: "Independência do Brasil",
						type: "national",
					},
				]),
			),
		)
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)
		expect(
			await screen.findByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()

		fireEvent.keyDown(window, { key: "ArrowRight" })
		expect(
			await screen.findByRole("heading", { name: /Outubro 2026/ }),
		).toBeInTheDocument()

		fireEvent.keyDown(window, { key: "ArrowLeft" })
		expect(
			await screen.findByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()
	})

	test("os ícones de navegação de ano são pixel-art nítidos e têm 16px (size-4)", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2025`, () => HttpResponse.json([])),
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([])),
			http.get(`${BRASIL_API_FERIADOS_URL}/2027`, () => HttpResponse.json([])),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		const previous = screen
			.getByLabelText("Ir para 2025 (ano anterior)")
			.querySelector("svg")
		const next = screen
			.getByLabelText("Ir para 2027 (ano seguinte)")
			.querySelector("svg")

		for (const icon of [previous, next]) {
			expect(icon).not.toBeNull()
			expect(icon).toHaveClass("size-4")
			expect(icon).toHaveAttribute("aria-hidden", "true")
			expect(icon).toHaveAttribute("shape-rendering", "crispEdges")
		}
		await screen.findByText("Nenhum feriado encontrado")
	})
})
