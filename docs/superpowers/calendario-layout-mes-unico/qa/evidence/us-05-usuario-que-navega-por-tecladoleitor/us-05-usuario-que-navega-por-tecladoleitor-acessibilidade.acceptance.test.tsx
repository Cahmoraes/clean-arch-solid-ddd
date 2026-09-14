import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { MonthlyCalendar } from "@/features/calendario-feriados/ui/monthly-calendar"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"

describe("US-05 — navegação por teclado/leitor de tela (FR-006, FR-007, FR-008)", () => {
	test("FR-006: setas de mês têm aria-label dinâmico com mês/ano alvo", () => {
		const { rerender } = renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		expect(
			screen.getByRole("button", { name: /Mês anterior, agosto 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }),
		).toBeInTheDocument()

		// virada dez -> jan
		rerender(
			<MonthlyCalendar
				monthIndex={11}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /Próximo mês, janeiro 2027/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Mês anterior, novembro 2026/ }),
		).toBeInTheDocument()

		// virada jan -> dez
		rerender(
			<MonthlyCalendar
				monthIndex={0}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /Mês anterior, dezembro 2025/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, fevereiro 2026/ }),
		).toBeInTheDocument()
	})

	test("FR-006: setas de ano têm aria-label com ano alvo", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
				]),
			),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(
			screen.getByRole("button", { name: /Ir para 2025 \(ano anterior\)/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Ir para 2027 \(ano seguinte\)/ }),
		).toBeInTheDocument()
	})

	test("FR-007: título do mês tem aria-live polite e é anunciado ao trocar mês", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
					{ date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" },
				]),
			),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		const headingSetembro = await screen.findByRole("heading", { name: /Setembro 2026/ })
		// aria-live no próprio heading (CardTitle as h2)
		expect(headingSetembro.getAttribute("aria-live")).toBe("polite")
		// também verifica via closest como no teste original
		expect(headingSetembro.closest('[aria-live="polite"]')).not.toBeNull()

		await user.click(screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }))

		const headingOutubro = await screen.findByRole("heading", { name: /Outubro 2026/ })
		expect(headingOutubro.getAttribute("aria-live")).toBe("polite")
	})

	test("FR-007 + foco: foco permanece na seta acionada após troca de mês (queueMicrotask)", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
				]),
			),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		await screen.findByRole("heading", { name: /Setembro 2026/ })

		const nextBtn = screen.getByRole("button", { name: /Próximo mês, outubro 2026/ })
		await user.click(nextBtn)

		// foco deve permanecer no botão de próximo mês (que agora vira "Próximo mês, novembro 2026")
		// queueMicrotask garante refocus; aguardamos microtask
		await new Promise((resolve) => queueMicrotask(resolve))
		expect(document.activeElement).toBe(nextBtn)
		expect(screen.getByRole("button", { name: /Próximo mês, novembro 2026/ })).toHaveFocus()

		const prevBtn = screen.getByRole("button", { name: /Mês anterior, setembro 2026/ })
		await user.click(prevBtn)
		await new Promise((resolve) => queueMicrotask(resolve))
		expect(document.activeElement).toBe(prevBtn)
	})

	test("FR-008: Card tem animação 180ms slide+fade e respeita prefers-reduced-motion", () => {
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		const card = document.querySelector('[data-slot="card"]')
		expect(card).not.toBeNull()
		expect(card?.className).toContain("duration-[180ms]")
		expect(card?.className).toContain("transition-[transform,opacity]")
		expect(card?.className).toContain("motion-reduce:transition-none")
	})

	test("FR-008 + FR-007: navegação por teclado ArrowLeft/Right mantém aria-live e atualiza aria-label", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
				]),
			),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()

		fireEvent.keyDown(window, { key: "ArrowRight" })

		expect(await screen.findByRole("heading", { name: /Outubro 2026/ })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, novembro 2026/ }),
		).toBeInTheDocument()
		expect(
			(await screen.findByRole("heading", { name: /Outubro 2026/ })).getAttribute("aria-live"),
		).toBe("polite")

		fireEvent.keyDown(window, { key: "ArrowLeft" })

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Mês anterior, agosto 2026/ }),
		).toBeInTheDocument()
	})
})
