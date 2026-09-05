import { act, cleanup, render, screen } from "@testing-library/react"
import { forwardRef, useImperativeHandle } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { WeatherGlobe } from "./weather-globe"

const {
	globePropsSpy,
	useGlobeCapabilityMock,
	pointOfViewMock,
	controlsState,
	forceContextLossMock,
	globeCanvas,
	rendererMock,
} = vi.hoisted(() => {
	const forceContextLossMock = vi.fn()
	const globeCanvas = document.createElement("canvas")
	return {
		globePropsSpy: vi.fn(),
		useGlobeCapabilityMock: vi.fn(),
		pointOfViewMock: vi.fn(),
		controlsState: { autoRotate: false, autoRotateSpeed: 0, enabled: true },
		forceContextLossMock,
		globeCanvas,
		rendererMock: vi.fn(() => ({
			forceContextLoss: forceContextLossMock,
			domElement: globeCanvas,
		})),
	}
})

vi.mock("./use-globe-capability", () => ({
	useGlobeCapability: useGlobeCapabilityMock,
}))

vi.mock("react-globe.gl", () => ({
	default: forwardRef(function MockGlobe(
		props: Record<string, unknown>,
		ref: React.Ref<unknown>,
	) {
		globePropsSpy(props)
		useImperativeHandle(ref, () => ({
			pointOfView: pointOfViewMock,
			controls: () => controlsState,
			renderer: rendererMock,
		}))
		return <div data-testid="mock-globe" />
	}),
}))

function mockWebglSupported() {
	useGlobeCapabilityMock.mockReturnValue("webgl")
}

describe("WeatherGlobe", () => {
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		globePropsSpy.mockClear()
		useGlobeCapabilityMock.mockReset()
		pointOfViewMock.mockClear()
		rendererMock.mockClear()
		forceContextLossMock.mockClear()
		controlsState.autoRotate = false
		controlsState.autoRotateSpeed = 0
		controlsState.enabled = true
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

	test("ativa auto-rotação e desabilita os controles de órbita/zoom ao montar o ramo interativo", () => {
		mockWebglSupported()

		render(<WeatherGlobe />)

		expect(controlsState.autoRotate).toBe(true)
		expect(controlsState.autoRotateSpeed).toBe(0.4)
		expect(controlsState.enabled).toBe(false)
	})

	test("anima a câmera até a coordenada buscada quando latitude/longitude são informadas", () => {
		mockWebglSupported()

		render(<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />)

		expect(pointOfViewMock).toHaveBeenCalledWith(
			{ lat: -23.5505, lng: -46.6333, altitude: 1.5 },
			1000,
		)
	})

	test("não anima a câmera e não renderiza marcador quando latitude/longitude não são informadas", () => {
		mockWebglSupported()

		render(<WeatherGlobe />)

		expect(pointOfViewMock).not.toHaveBeenCalled()
		expect(globePropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({ pointsData: [] }),
		)
	})

	test("uma nova busca sobrescreve o alvo de câmera anterior sem enfileirar chamadas", () => {
		mockWebglSupported()

		const { rerender } = render(
			<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />,
		)
		rerender(<WeatherGlobe latitude={-22.9068} longitude={-43.1729} />)

		expect(pointOfViewMock).toHaveBeenLastCalledWith(
			{ lat: -22.9068, lng: -43.1729, altitude: 1.5 },
			1000,
		)
	})

	test("uma busca que falha (props não mudam) mantém a última posição sem nova chamada a pointOfView", () => {
		mockWebglSupported()

		const { rerender } = render(
			<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />,
		)
		pointOfViewMock.mockClear()
		rerender(<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />)

		expect(pointOfViewMock).not.toHaveBeenCalled()
	})

	test("libera o contexto WebGL e desativa a auto-rotação ao desmontar", () => {
		mockWebglSupported()

		const { unmount } = render(<WeatherGlobe />)
		unmount()

		expect(forceContextLossMock).toHaveBeenCalledTimes(1)
		expect(controlsState.autoRotate).toBe(false)
	})

	test("troca para o fallback estático quando o contexto WebGL é perdido", () => {
		mockWebglSupported()

		render(<WeatherGlobe />)
		act(() => {
			globeCanvas.dispatchEvent(new Event("webglcontextlost"))
		})

		expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()
		expect(screen.queryByTestId("weather-globe-canvas")).not.toBeInTheDocument()
	})
})
