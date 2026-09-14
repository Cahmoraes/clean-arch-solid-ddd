import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { getFeriadosDoMes } from "@/features/calendario-feriados/lib/get-feriados-do-mes"
import { HolidayList } from "@/features/calendario-feriados/ui/holiday-list"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"

describe("US-04 — lista lateral filtrada pelo mês visível (FR-005)", () => {
	test("deve filtrar feriados em memória por mês via getFeriadosDoMes", () => {
		const feriados = [
			{ date: "2026-09-07", name: "Independência do Brasil", type: "national" as const, isNational: true },
			{ date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" as const, isNational: true },
			{ date: "2026-11-02", name: "Finados", type: "national" as const, isNational: true },
			{ date: "2026-12-25", name: "Natal", type: "national" as const, isNational: true },
		]

		expect(getFeriadosDoMes(feriados, 8)).toHaveLength(1)
		expect(getFeriadosDoMes(feriados, 8)[0]?.name).toBe("Independência do Brasil")
		expect(getFeriadosDoMes(feriados, 9)).toHaveLength(1)
		expect(getFeriadosDoMes(feriados, 9)[0]?.name).toBe("Nossa Senhora Aparecida")
		expect(getFeriadosDoMes(feriados, 0)).toHaveLength(0)
	})

	test("deve renderizar título Feriados de {mês} e subtítulo {n} de {total} em {ano}", () => {
		const feriadosSetembro = [
			{ date: "2026-09-07", name: "Independência do Brasil", type: "national" as const, isNational: true },
		]

		renderWithProviders(<HolidayList feriados={feriadosSetembro} monthIndex={8} year={2026} total={9} />)

		expect(screen.getByRole("heading", { name: "Feriados de setembro" })).toBeInTheDocument()
		expect(screen.getByText("1 de 9 em 2026")).toBeInTheDocument()
		expect(screen.getByText("Independência do Brasil")).toBeInTheDocument()
		expect(screen.getByText("07/09/2026")).toBeInTheDocument()
	})

	test("deve exibir apenas feriados do mês e mensagem vazia quando nenhum feriado no mês", () => {
		const { rerender } = renderWithProviders(
			<HolidayList feriados={[]} monthIndex={1} year={2026} total={9} />,
		)

		expect(screen.getByRole("heading", { name: "Feriados de fevereiro" })).toBeInTheDocument()
		expect(screen.getByText("0 de 9 em 2026")).toBeInTheDocument()
		expect(screen.getByText("Nenhum feriado neste mês.")).toBeInTheDocument()
		expect(screen.queryByRole("list")).not.toBeInTheDocument()

		const feriadosOutubro = [
			{ date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" as const, isNational: true },
		]
		rerender(<HolidayList feriados={feriadosOutubro} monthIndex={9} year={2026} total={9} />)

		expect(screen.getByRole("heading", { name: "Feriados de outubro" })).toBeInTheDocument()
		expect(screen.getByText("1 de 9 em 2026")).toBeInTheDocument()
		expect(screen.queryByText("Nenhum feriado neste mês.")).not.toBeInTheDocument()
		expect(screen.getByText("Nossa Senhora Aparecida")).toBeInTheDocument()
	})

	test("deve subtítulo alternativo quando total não informado", () => {
		const feriados = [
			{ date: "2026-09-07", name: "Independência do Brasil", type: "national" as const, isNational: true },
		]

		renderWithProviders(<HolidayList feriados={feriados} monthIndex={8} year={2026} />)

		expect(screen.getByText("1 feriado(s) no mês")).toBeInTheDocument()
	})

	test("deve filtrar sidebar ao navegar entre meses na CalendarPage", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
					{ date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" },
					{ date: "2026-11-02", name: "Finados", type: "national" },
				]),
			),
		)
		const user = userEvent.setup()

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()

		const sidebarSetembro = within(screen.getByRole("complementary"))
		expect(sidebarSetembro.getByRole("heading", { name: "Feriados de setembro" })).toBeInTheDocument()
		expect(sidebarSetembro.getByText("1 de 3 em 2026")).toBeInTheDocument()
		expect(sidebarSetembro.getByText("Independência do Brasil")).toBeInTheDocument()
		expect(sidebarSetembro.queryByText("Nossa Senhora Aparecida")).not.toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }))

		expect(await screen.findByRole("heading", { name: /Outubro 2026/ })).toBeInTheDocument()
		const sidebarOutubro = within(screen.getByRole("complementary"))
		expect(sidebarOutubro.getByRole("heading", { name: "Feriados de outubro" })).toBeInTheDocument()
		expect(sidebarOutubro.getByText("1 de 3 em 2026")).toBeInTheDocument()
		expect(sidebarOutubro.getByText("Nossa Senhora Aparecida")).toBeInTheDocument()
		expect(sidebarOutubro.queryByText("Independência do Brasil")).not.toBeInTheDocument()

		// mês sem feriado (agosto = 7) deve mostrar mensagem vazia
		await user.click(screen.getByRole("button", { name: /Mês anterior, setembro 2026/ }))
		await user.click(screen.getByRole("button", { name: /Mês anterior, agosto 2026/ }))

		expect(await screen.findByRole("heading", { name: /Agosto 2026/ })).toBeInTheDocument()
		const sidebarAgosto = within(screen.getByRole("complementary"))
		expect(sidebarAgosto.getByRole("heading", { name: "Feriados de agosto" })).toBeInTheDocument()
		expect(sidebarAgosto.getByText("0 de 3 em 2026")).toBeInTheDocument()
		expect(sidebarAgosto.getByText("Nenhum feriado neste mês.")).toBeInTheDocument()
	})

	test("deve manter filtro por mês após navegação via teclado ArrowRight/ArrowLeft", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json([
					{ date: "2026-09-07", name: "Independência do Brasil", type: "national" },
					{ date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" },
				]),
			),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()
		expect(within(screen.getByRole("complementary")).getByText("Independência do Brasil")).toBeInTheDocument()

		fireEvent.keyDown(window, { key: "ArrowRight" })

		expect(await screen.findByRole("heading", { name: /Outubro 2026/ })).toBeInTheDocument()
		expect(within(screen.getByRole("complementary")).getByText("Nossa Senhora Aparecida")).toBeInTheDocument()
		expect(within(screen.getByRole("complementary")).queryByText("Independência do Brasil")).not.toBeInTheDocument()

		fireEvent.keyDown(window, { key: "ArrowLeft" })

		expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()
		expect(within(screen.getByRole("complementary")).getByText("Independência do Brasil")).toBeInTheDocument()
	})
})
