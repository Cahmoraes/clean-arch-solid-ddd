import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const BRASIL_API = "https://brasilapi.com.br/api/feriados/v1"

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve: () => void = () => undefined
	const promise = new Promise<void>((res) => {
		resolve = res
	})
	return { promise, resolve }
}

describe("US-06 - estados de carregamento e erro ao navegar entre meses/anos", () => {
	test("deve exibir role=status com Skeleton durante carregamento preservando PageHeader", async () => {
		const deferred = createDeferred()
		server.use(
			http.get(`${BRASIL_API}/2026`, async () => {
				await deferred.promise
				return HttpResponse.json([])
			}),
		)
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		// PageHeader deve permanecer visivel mesmo em loading
		expect(screen.getByRole("heading", { name: "Calendário 2026" })).toBeInTheDocument()
		// controles de ano visiveis
		expect(screen.getByRole("button", { name: /Ir para 2025/ })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Ir para 2027/ })).toBeInTheDocument()

		// estado de carregamento
		const status = await screen.findByRole("status")
		expect(status).toHaveTextContent("Carregando feriados")
		// Skeleton presente via data-testid
		expect(screen.getByTestId("skeleton")).toBeInTheDocument()

		deferred.resolve()
		await waitFor(() => {
			expect(screen.queryByRole("status", { name: "Carregando feriados" })).not.toBeInTheDocument()
		})
	})

	test("deve exibir role=alert com botao Tentar novamente em erro preservando PageHeader", async () => {
		server.use(
			http.get(`${BRASIL_API}/2026`, () =>
				HttpResponse.json({ message: "indisponível" }, { status: 503 }),
			),
		)
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		const alert = await screen.findByRole("alert", undefined, { timeout: 4000 })
		expect(alert).toHaveTextContent("Não foi possível carregar os feriados")
		expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled()
		// PageHeader preservado em erro
		expect(screen.getByRole("heading", { name: "Calendário 2026" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Ir para 2025/ })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Ir para 2027/ })).toBeInTheDocument()
	})

	test("deve refazer consulta ao acionar Tentar novamente após erro", async () => {
		let count = 0
		server.use(
			http.get(`${BRASIL_API}/2026`, () => {
				count += 1
				if (count <= 2) return HttpResponse.json({ message: "erro" }, { status: 503 })
				return HttpResponse.json([{ date: "2026-09-07", name: "Independência do Brasil", type: "national" }])
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		await screen.findByRole("alert", undefined, { timeout: 4000 })
		await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

		expect((await screen.findAllByText("Independência do Brasil", undefined, { timeout: 4000 })).length).toBeGreaterThan(0)
		expect(count).toBe(3)
	})

	test("deve preservar PageHeader e controles ao trocar de ano com loading", async () => {
		const deferred2027 = createDeferred()
		server.use(
			http.get(`${BRASIL_API}/2026`, () =>
				HttpResponse.json([{ date: "2026-09-07", name: "Independência do Brasil", type: "national" }]),
			),
			http.get(`${BRASIL_API}/2027`, async () => {
				await deferred2027.promise
				return HttpResponse.json([{ date: "2027-09-07", name: "Independência do Brasil", type: "national" }])
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /Ir para 2027/ }))

		// PageHeader atualiza mas permanece visivel; durante fetch deve haver role=status
		expect(screen.getByRole("heading", { name: "Calendário 2027" })).toBeInTheDocument()
		// controles ainda visiveis
		expect(screen.getByRole("button", { name: /Ir para 2026/ })).toBeInTheDocument()
		expect(await screen.findByRole("status")).toBeInTheDocument()

		deferred2027.resolve()
		expect(await screen.findByRole("heading", { name: /Setembro 2027/ }, { timeout: 3000 })).toBeInTheDocument()
	})

	test("deve preservar PageHeader ao navegar entre meses sem nova busca (mesmo ano)", async () => {
		server.use(
			http.get(`${BRASIL_API}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
					{ date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" },
				]),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Calendário 2026" })).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }))

		expect(await screen.findByRole("heading", { name: /Outubro 2026/ })).toBeInTheDocument()
		// PageHeader ainda Calendário 2026
		expect(screen.getByRole("heading", { name: "Calendário 2026" })).toBeInTheDocument()
		// sem role=status de loading pois dados já em cache
		expect(screen.queryByText("Carregando feriados")).not.toBeInTheDocument()
	})

	test("deve mostrar erro recuperavel ao falhar busca de novo ano via virada dez->jan", async () => {
		server.use(
			http.get(`${BRASIL_API}/2026`, () =>
				HttpResponse.json([{ date: "2026-12-25", name: "Natal", type: "national" }]),
			),
			http.get(`${BRASIL_API}/2027`, () =>
				HttpResponse.json({ message: "erro" }, { status: 503 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={11} />)

		expect(await screen.findByRole("heading", { name: /Dezembro 2026/ })).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /Próximo mês, janeiro 2027/ }))

		// ao falhar novo ano, deve mostrar alert mas PageHeader com 2027 preservado (com retry delay)
		expect(await screen.findByRole("alert", undefined, { timeout: 4000 })).toHaveTextContent("Não foi possível carregar os feriados")
		expect(screen.getByRole("heading", { name: "Calendário 2027" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled()
		fireEvent.click(screen.getByRole("button", { name: /Ir para 2026/ }))
	})
})
