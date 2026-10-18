import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { WeatherResponse } from "@/features/weather/api/use-weather-query"
import { HourlyForecast } from "./hourly-forecast"

const hourly: WeatherResponse["hourly"] = Array.from(
	{ length: 24 },
	(_, i) => ({
		time: new Date(Date.UTC(2026, 9, 18, 15 + i)).toISOString().slice(0, 16),
		temperature: 20 + (i % 3),
		code: i === 0 ? 1 : 61,
		isDay: true,
	}),
)

describe("HourlyForecast", () => {
	test("AC-02: deve mostrar 24 itens em ordem, com Agora no primeiro e a hora local nos demais", () => {
		render(<HourlyForecast hourly={hourly} units="metric" />)

		const items = screen.getAllByRole("listitem")
		expect(items).toHaveLength(24)
		expect(within(items[0]).getByText("Agora")).toBeInTheDocument()
		expect(within(items[0]).getByText("20°")).toBeInTheDocument()
		expect(within(items[0]).getByText("Céu limpo")).toBeInTheDocument()
		expect(within(items[1]).getByText("16h")).toBeInTheDocument()
		expect(within(items[1]).getByText("Chuva")).toBeInTheDocument()
		expect(within(items[9]).getByText("0h")).toBeInTheDocument()
		expect(within(items[23]).getByText("14h")).toBeInTheDocument()
		expect(items[0].className).toContain("border-primary")
		expect(items[1].className).not.toContain("border-primary")
	})

	test("deve converter a temperatura de cada hora para °F no sistema imperial", () => {
		render(<HourlyForecast hourly={hourly} units="imperial" />)

		expect(
			within(screen.getAllByRole("listitem")[2]).getByText("71,6°"),
		).toBeInTheDocument()
	})

	test("deve expor a faixa como região rolável focável com título", () => {
		render(<HourlyForecast hourly={hourly} units="metric" />)

		const region = screen.getByRole("region", { name: "Próximas 24 horas" })
		expect(region).toHaveAttribute("tabindex", "0")
		expect(region.className).toContain("overflow-x-auto")
		expect(
			screen.getByRole("heading", { level: 2, name: "Próximas horas" }),
		).toBeInTheDocument()
	})
})
