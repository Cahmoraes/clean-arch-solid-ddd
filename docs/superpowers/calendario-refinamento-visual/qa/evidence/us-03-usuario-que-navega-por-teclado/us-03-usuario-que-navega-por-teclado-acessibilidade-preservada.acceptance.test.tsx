import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { MonthlyCalendar } from "../../../../../../apps/frontend/src/features/calendario-feriados/ui/monthly-calendar"

// US-03: Como usuário que navega por teclado ou usa leitor de tela, eu quero que
// a navegação e os destaques do calendário continuem totalmente acessíveis após
// a mudança visual, para não perder capacidade de uso. (FR-005)
describe("US-03 - acessibilidade do calendário preservada após refinamento visual", () => {
	test("mantém role=grid/gridcell, aria-live no cabeçalho e aplica aria-current ao dia atual", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0))

		try {
			render(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[
						{
							date: "2026-09-07",
							name: "Independência do Brasil",
							type: "national",
							isNational: true,
						},
					]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			// role="grid" preservado no container do mês
			const grid = screen.getByRole("grid")
			expect(grid).toBeInTheDocument()

			// role="gridcell" preservado em cada dia (37 células: 42 - vazios variam por mês)
			const gridcells = screen.getAllByRole("gridcell")
			expect(gridcells.length).toBeGreaterThan(0)

			// aria-live="polite" preservado no cabeçalho do mês (heading)
			const heading = screen.getByRole("heading", { name: /Setembro 2026/ })
			expect(heading).toHaveAttribute("aria-live", "polite")

			// aria-current="date" aplicado apenas ao dia de hoje
			const todayCell = screen.getByLabelText(
				"7 de setembro: Independência do Brasil, feriado nacional de 2026",
			)
			expect(todayCell).toHaveAttribute("aria-current", "date")
			expect(todayCell).toHaveAttribute("role", "gridcell")

			const otherCell = screen.getByLabelText("8 de setembro")
			expect(otherCell).not.toHaveAttribute("aria-current")
			expect(otherCell).toHaveAttribute("role", "gridcell")

			// setas de navegação continuam acessíveis via teclado (botões nativos com aria-label)
			expect(
				screen.getByRole("button", { name: /Mês anterior, agosto 2026/ }),
			).toBeInTheDocument()
			expect(
				screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }),
			).toBeInTheDocument()
		} finally {
			vi.useRealTimers()
		}
	})
})
