import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { WeatherResponse } from "@/features/weather/api/use-weather-query"
import { DailyForecast } from "./daily-forecast"

// 2026-10-18 é domingo; a faixa da semana vai de 10 a 30
const daily: WeatherResponse["daily"] = [
	{ date: "2026-10-18", min: 10, max: 20, code: 1 },
	{ date: "2026-10-19", min: 20, max: 30, code: 61 },
	...["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"].map(
		(date) => ({ date, min: 15, max: 25, code: 3 }),
	),
]

describe("DailyForecast", () => {
	test("AC-01: deve mostrar os 7 dias com dia da semana, condição, mínima e máxima", () => {
		render(<DailyForecast daily={daily} units="metric" />)

		const rows = screen.getAllByRole("listitem")
		expect(rows).toHaveLength(7)
		expect(within(rows[0]).getByText("Hoje")).toBeInTheDocument()
		expect(within(rows[0]).getByText("10° / 20°")).toBeInTheDocument()
		expect(within(rows[0]).getByText("Céu limpo")).toBeInTheDocument()
		expect(within(rows[1]).getByText("Seg")).toBeInTheDocument()
		expect(within(rows[1]).getByText("Chuva")).toBeInTheDocument()
		expect(within(rows[6]).getByText("Sáb")).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { level: 2, name: "Próximos 7 dias" }),
		).toBeInTheDocument()
	})

	test("deve converter mínima e máxima para °F no sistema imperial", () => {
		render(<DailyForecast daily={daily} units="imperial" />)

		expect(
			within(screen.getAllByRole("listitem")[0]).getByText("50° / 68°"),
		).toBeInTheDocument()
	})

	test("deve posicionar a barra de cada dia dentro da faixa mínima/máxima da semana", () => {
		render(<DailyForecast daily={daily} units="metric" />)

		const fills = screen.getAllByTestId("daily-range-fill")
		expect(fills[0].style.marginLeft).toBe("0%")
		expect(fills[0].style.width).toBe("50%")
		expect(fills[1].style.marginLeft).toBe("50%")
		expect(fills[1].style.width).toBe("50%")
	})
})
