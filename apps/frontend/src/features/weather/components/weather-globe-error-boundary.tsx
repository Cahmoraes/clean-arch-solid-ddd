"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import {
	WeatherGlobeFallback,
	WeatherGlobe as WeatherGlobeImpl,
	type WeatherGlobeProps,
} from "./weather-globe"

interface WeatherGlobeErrorBoundaryState {
	hasError: boolean
}

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
		return <WeatherGlobeImpl {...this.props} />
	}
}

export type { WeatherGlobeProps }
export { WeatherGlobeErrorBoundary as WeatherGlobe }
