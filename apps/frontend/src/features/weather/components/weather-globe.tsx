"use client"

import { useMemo } from "react"
import Globe from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import { useGlobeCapability } from "./use-globe-capability"

const GLOBE_SIZE_PX = 128
const GLOBE_SURFACE_COLOR = "#061410"

const GLOBE_BACKGROUND_STYLE = {
	background:
		"radial-gradient(circle at center, #123a2c 0%, #061410 55%, #020403 100%)",
	boxShadow: "0 0 24px 4px rgba(57, 229, 140, 0.18)",
}

export interface WeatherGlobeProps {
	latitude?: number
	longitude?: number
}

export function WeatherGlobeFallback() {
	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-fallback"
			className="mx-auto h-32 w-32 rounded-full"
			style={GLOBE_BACKGROUND_STYLE}
		/>
	)
}

export function WeatherGlobe(_props: WeatherGlobeProps) {
	const capability = useGlobeCapability()
	const globeMaterial = useMemo(
		() => new MeshPhongMaterial({ color: GLOBE_SURFACE_COLOR }),
		[],
	)

	if (capability !== "webgl") {
		return <WeatherGlobeFallback />
	}

	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-canvas"
			className="mx-auto h-32 w-32 overflow-hidden rounded-full"
			style={GLOBE_BACKGROUND_STYLE}
		>
			<Globe
				width={GLOBE_SIZE_PX}
				height={GLOBE_SIZE_PX}
				backgroundColor="rgba(0,0,0,0)"
				globeMaterial={globeMaterial}
				enablePointerInteraction={false}
			/>
		</div>
	)
}
