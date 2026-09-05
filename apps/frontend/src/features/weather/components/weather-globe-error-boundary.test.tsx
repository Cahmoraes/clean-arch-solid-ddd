import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

// O módulo do globo é carregado por `dynamic()` dentro do boundary, no momento
// em que o boundary é avaliado. Por isso cada cenário precisa de um registry
// limpo (`resetModules`) antes de importar o boundary.
async function renderBoundary() {
	const { WeatherGlobe } = await import("./weather-globe-error-boundary")
	render(<WeatherGlobe />)
}

describe("WeatherGlobeErrorBoundary", () => {
	beforeEach(() => {
		vi.resetModules()
		vi.spyOn(console, "error").mockImplementation(() => {})
	})

	afterEach(() => {
		cleanup()
		vi.doUnmock("./weather-globe")
		vi.restoreAllMocks()
	})

	test("renderiza o fallback estático quando o WeatherGlobe lança uma exceção em tempo de execução", async () => {
		vi.doMock("./weather-globe", () => ({
			WeatherGlobe: () => {
				throw new Error("falha simulada no WeatherGlobe")
			},
		}))

		await renderBoundary()

		expect(
			await screen.findByTestId("weather-globe-fallback"),
		).toBeInTheDocument()
	})

	test("renderiza o fallback estático quando o chunk do globo falha ao carregar", async () => {
		vi.doMock("./weather-globe", () => {
			throw new Error("falha simulada ao carregar o chunk do globo")
		})

		await renderBoundary()

		expect(
			await screen.findByTestId("weather-globe-fallback"),
		).toBeInTheDocument()
	})
})
