import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
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
						date: "2025-12-25",
						name: "Natal",
						type: "national",
					},
				]),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{
						date: "2026-04-21",
						name: "Tiradentes",
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

		renderWithProviders(<CalendarPage initialYear={2026} />)

		expect(
			screen.getByRole("heading", { name: "Calendário 2026" }),
		).toBeInTheDocument()
		expect((await screen.findAllByText("Tiradentes")).length).toBeGreaterThan(0)

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

	test("mostra ano atual como padrão quando initialYear não é informado", async () => {
		const currentYear = new Date().getFullYear()
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/${currentYear}`, () =>
				HttpResponse.json([
					{
						date: `${currentYear}-09-07`,
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

		renderWithProviders(<CalendarPage initialYear={2026} />)

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

		renderWithProviders(<CalendarPage initialYear={2026} />)

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
						date: "2026-12-25",
						name: "Natal",
						type: "national",
					},
				])
			}),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage initialYear={2026} />)

		await screen.findByRole("alert", undefined, { timeout: 3_000 })
		await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

		expect((await screen.findAllByText("Natal")).length).toBeGreaterThan(0)
		expect(requestCount).toBe(3)
	})

	test("mostra estado vazio quando ano não tem feriados retornados", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([])),
		)

		renderWithProviders(<CalendarPage initialYear={2026} />)

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

		renderWithProviders(<CalendarPage initialYear={2026} />)

		const aprilCard = await screen.findByRole("region", { name: "Abril 2026" })
		const holidayDay = within(aprilCard).getByRole("listitem", {
			name: /21 de abril: Tiradentes/,
		})
		expect(holidayDay).not.toHaveAttribute("aria-current")
	})
})
