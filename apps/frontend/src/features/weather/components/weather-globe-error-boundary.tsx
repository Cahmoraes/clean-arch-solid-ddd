"use client"

import dynamic from "next/dynamic"
import { Component, type ErrorInfo, type ReactNode, Suspense } from "react"
import type { WeatherGlobeProps } from "./weather-globe-constants"
import { WeatherGlobeFallback } from "./weather-globe-fallback"

interface WeatherGlobeErrorBoundaryState {
	hasError: boolean
}

// O chunk pesado (`react-globe.gl` + `three`) é carregado aqui DENTRO do
// boundary. Assim, uma falha no fetch do chunk vira um erro de render capturado
// pelo próprio boundary, em vez de subir para a página e derrubar o clima.
const WeatherGlobeImpl = dynamic(
	() =>
		import("./weather-globe").then((mod) => ({ default: mod.WeatherGlobe })),
	{ ssr: false },
)

class WeatherGlobeErrorBoundary extends Component<
	WeatherGlobeProps,
	WeatherGlobeErrorBoundaryState
> {
	public state: WeatherGlobeErrorBoundaryState = { hasError: false }

	public static getDerivedStateFromError(): WeatherGlobeErrorBoundaryState {
		return { hasError: true }
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("WeatherGlobe falhou ao renderizar", error, errorInfo)
	}

	public render(): ReactNode {
		if (this.state.hasError) {
			return <WeatherGlobeFallback />
		}
		return (
			<Suspense fallback={null}>
				<WeatherGlobeImpl {...this.props} />
			</Suspense>
		)
	}
}

export { WeatherGlobeErrorBoundary as WeatherGlobe }
