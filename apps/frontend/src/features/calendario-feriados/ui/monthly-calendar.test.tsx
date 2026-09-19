import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { MonthlyCalendar } from "./monthly-calendar"

const independencia = {
	date: "2026-09-07",
	name: "Independência do Brasil",
	type: "national",
	isNational: true,
} as const

describe("MonthlyCalendar", () => {
	test("renderiza apenas o mês solicitado com feriado destacado", () => {
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[independencia]}
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
		renderWithProviders(
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
		const { rerender } = renderWithProviders(
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

	test("destaca o dia atual com aria-current e cor primária", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0))

		try {
			renderWithProviders(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const todayCell = screen.getByLabelText("19 de setembro")
			expect(todayCell).toHaveAttribute("aria-current", "date")
			expect(todayCell).toHaveClass("border-primary", "bg-primary/10")
		} finally {
			vi.useRealTimers()
		}
	})

	test("feriado usa cor âmbar distinta da cor primária do dia atual", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0))

		try {
			renderWithProviders(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[independencia]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const holidayCell = screen.getByLabelText(/7 de setembro.*Independência/)
			const todayCell = screen.getByLabelText("19 de setembro")
			expect(holidayCell).toHaveClass("border-warning", "bg-warning/10")
			expect(holidayCell).not.toHaveClass("border-primary")
			expect(todayCell).toHaveClass("border-primary", "bg-primary/10")
		} finally {
			vi.useRealTimers()
		}
	})

	test("dia que é feriado e hoje prevalece com a cor primária", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0))

		try {
			renderWithProviders(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[independencia]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const cell = screen.getByLabelText(/7 de setembro.*Independência/)
			expect(cell).toHaveAttribute("aria-current", "date")
			expect(cell).toHaveClass("border-primary", "bg-primary/10")
			expect(cell).not.toHaveClass("border-warning")
		} finally {
			vi.useRealTimers()
		}
	})

	test("exibe tooltip com o nome do feriado ao passar o mouse", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[independencia]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		await user.hover(screen.getByLabelText(/7 de setembro.*Independência/))

		expect(await screen.findByRole("tooltip")).toHaveTextContent(
			"Independência do Brasil",
		)
	})

	test("dia comum não exibe tooltip ao passar o mouse", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[independencia]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		await user.hover(screen.getByLabelText("8 de setembro"))

		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
	})
})
