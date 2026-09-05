import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("./weather-globe", () => ({
	WeatherGlobe: () => {
		throw new Error("falha simulada no WeatherGlobe")
	},
	WeatherGlobeFallback: () => (
		<div aria-hidden="true" data-testid="weather-globe-fallback" />
	),
}))

import { WeatherGlobe } from "./weather-globe-error-boundary"

describe("WeatherGlobeErrorBoundary", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	test("renderiza o fallback estático quando o WeatherGlobe lança uma exceção em tempo de execução", () => {
		vi.spyOn(console, "error").mockImplementation(() => {})

		render(<WeatherGlobe />)

		expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()
	})
})
