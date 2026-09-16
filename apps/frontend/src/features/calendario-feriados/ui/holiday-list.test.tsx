import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { HolidayList } from "./holiday-list"

describe("HolidayList", () => {
	test("agrupa feriados do mês por semana, com divisor visual acessível", () => {
		render(
			<HolidayList
				feriados={[
					{
						date: "2026-09-07",
						name: "Feriado A",
						type: "national",
						isNational: true,
					},
					{
						date: "2026-09-21",
						name: "Feriado B",
						type: "national",
						isNational: true,
					},
				]}
				monthIndex={8}
				year={2026}
			/>,
		)

		const semana2 = screen.getByRole("group", { name: "Semana 2" })
		const semana4 = screen.getByRole("group", { name: "Semana 4" })

		expect(within(semana2).getByText("Feriado A")).toBeInTheDocument()
		expect(within(semana4).getByText("Feriado B")).toBeInTheDocument()
	})
})
