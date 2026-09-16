import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { MonthlyCalendar } from "./monthly-calendar"

describe("MonthlyCalendar", () => {
	test("renderiza apenas o mês solicitado com feriado destacado", () => {
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
		expect(
			screen.getByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.getByLabelText(/7 de setembro.*Independência/),
		).toBeInTheDocument()
		expect(screen.queryByText("Outubro")).not.toBeInTheDocument()
	})
	test("setas têm aria-label com mês/ano alvo", () => {
		render(
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
	})

	test("setas têm aria-label correto na virada de ano dez→jan e jan→dez", () => {
		const { rerender } = render(
			<MonthlyCalendar
				monthIndex={11}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /Mês anterior, novembro 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, janeiro 2027/ }),
		).toBeInTheDocument()

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

	test("destaca o dia atual com aria-current e a mesma cor primária do feriado", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0))

		try {
			render(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const todayCell = screen.getByLabelText("7 de setembro")
			expect(todayCell).toHaveAttribute("aria-current", "date")
			expect(todayCell).toHaveClass("border-primary", "bg-primary/10")
		} finally {
			vi.useRealTimers()
		}
	})
})
