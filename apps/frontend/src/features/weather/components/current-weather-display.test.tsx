import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CurrentWeatherDisplay } from "./current-weather-display"

const weather = {
	temperature: { current: 22.4, apparent: 21.8, min: 18, max: 27 },
	condition: { code: 1, isDay: true },
	humidity: 64,
	wind: { speed: 12, directionDegrees: 45 },
}

describe("CurrentWeatherDisplay", () => {
	test("deve mostrar cidade, condição, sensação, umidade, vento e mínima/máxima no padrão métrico", () => {
		render(
			<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" />,
		)

		expect(screen.getByText("Cajamar")).toBeInTheDocument()
		expect(screen.getByText("22,4°C")).toBeInTheDocument()
		expect(screen.getByText("Céu limpo")).toBeInTheDocument()
		expect(screen.getByText("Sensação")).toBeInTheDocument()
		expect(screen.getByText("21,8°C")).toBeInTheDocument()
		expect(screen.getByText("Umidade")).toBeInTheDocument()
		expect(screen.getByText("64%")).toBeInTheDocument()
		expect(screen.getByText("Vento")).toBeInTheDocument()
		expect(screen.getByText("12 km/h NE")).toBeInTheDocument()
		expect(screen.getByText("Mínima")).toBeInTheDocument()
		expect(screen.getByText("18°C")).toBeInTheDocument()
		expect(screen.getByText("Máxima")).toBeInTheDocument()
		expect(screen.getByText("27°C")).toBeInTheDocument()
	})

	test("deve converter temperaturas e vento para °F e mph no sistema imperial", () => {
		render(
			<CurrentWeatherDisplay
				city="Cajamar"
				weather={weather}
				units="imperial"
			/>,
		)

		expect(screen.getByText("72,3°F")).toBeInTheDocument()
		expect(screen.getByText("71,2°F")).toBeInTheDocument()
		expect(screen.getByText("7 mph NE")).toBeInTheDocument()
		expect(screen.getByText("64,4°F")).toBeInTheDocument()
		expect(screen.getByText("80,6°F")).toBeInTheDocument()
	})

	test("AC-11: deve exibir o número grande em font-display, tamanho múltiplo de 16px, tracking positivo e sem font-bold", () => {
		render(
			<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" />,
		)

		const big = screen.getByText("22,4°C")
		const size = Number(/text-\[(\d+)px\]/.exec(big.className)?.[1])
		expect(big.className).toContain("font-display")
		expect(size % 16).toBe(0)
		expect(big.className).toMatch(/tracking-\[0\.\d+em\]/)
		expect(big.className).not.toMatch(
			/font-(bold|semibold|medium|black|extrabold)/,
		)
	})

	test("deve mostrar o rótulo da condição em text-accent e o ícone de 64px decorativo", () => {
		const { container } = render(
			<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" />,
		)

		expect(screen.getByText("Céu limpo").className).toContain("text-accent")
		const icon = container.querySelector("svg")
		expect(icon).toHaveAttribute("aria-hidden", "true")
		expect(icon?.getAttribute("class")).toContain("h-16")
	})

	test("deve renderizar o slot actions no card", () => {
		render(
			<CurrentWeatherDisplay
				city="Cajamar"
				weather={weather}
				units="metric"
				actions={<button type="button">ação</button>}
			/>,
		)

		expect(screen.getByRole("button", { name: "ação" })).toBeInTheDocument()
	})
})
