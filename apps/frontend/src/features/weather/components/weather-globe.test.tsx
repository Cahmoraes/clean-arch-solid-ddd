import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { WeatherGlobe } from "./weather-globe"

const { globePropsSpy, useGlobeCapabilityMock } = vi.hoisted(() => ({
	globePropsSpy: vi.fn(),
	useGlobeCapabilityMock: vi.fn(),
}))

vi.mock("./use-globe-capability", () => ({
	useGlobeCapability: useGlobeCapabilityMock,
}))

vi.mock("react-globe.gl", () => ({
	default: (props: Record<string, unknown>) => {
		globePropsSpy(props)
		return <div data-testid="mock-globe" />
	},
}))

describe("WeatherGlobe", () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		globePropsSpy.mockClear()
		useGlobeCapabilityMock.mockReset()
	})

	test("renderiza fallback estático com aria-hidden quando a capacidade é 'fallback'", () => {
		useGlobeCapabilityMock.mockReturnValue("fallback")

		render(<WeatherGlobe />)

		expect(screen.getByTestId("weather-globe-fallback")).toHaveAttribute(
			"aria-hidden",
			"true",
		)
	})

	test("renderiza o globo interativo com aria-hidden e enablePointerInteraction desativado quando a capacidade é 'webgl'", () => {
		useGlobeCapabilityMock.mockReturnValue("webgl")

		render(<WeatherGlobe />)

		expect(screen.getByTestId("weather-globe-canvas")).toHaveAttribute(
			"aria-hidden",
			"true",
		)
		expect(globePropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({ enablePointerInteraction: false }),
		)
	})

	test("renderiza o globo sem textura externa, usando globeMaterial sólido", () => {
		useGlobeCapabilityMock.mockReturnValue("webgl")

		render(<WeatherGlobe />)

		const globeProps = globePropsSpy.mock.calls[0][0]
		expect(globeProps.globeImageUrl).toBeUndefined()
		expect(globeProps.globeMaterial).toBeDefined()
	})
})
