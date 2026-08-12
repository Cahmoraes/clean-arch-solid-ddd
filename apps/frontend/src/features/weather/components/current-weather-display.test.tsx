import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CurrentWeatherDisplay } from "./current-weather-display"

describe("CurrentWeatherDisplay", () => {
	test("renderiza cidade e temperaturas atual, mínima e máxima", () => {
		render(
			<CurrentWeatherDisplay
				city="São Paulo"
				temperature={{ current: 24, min: 18, max: 27 }}
			/>,
		)

		expect(screen.getByText("São Paulo")).toBeInTheDocument()
		expect(screen.getByText("24°C")).toBeInTheDocument()
		expect(screen.getByText("18°C")).toBeInTheDocument()
		expect(screen.getByText("27°C")).toBeInTheDocument()
	})
})
