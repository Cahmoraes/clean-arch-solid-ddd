"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Globe, { type GlobeMethods } from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import { useGlobeCapability } from "./use-globe-capability"

const GLOBE_SIZE_PX = 128
const GLOBE_SURFACE_COLOR = "#061410"
const CAMERA_ALTITUDE = 1.5
const CAMERA_TRANSITION_MS = 1000
const AUTO_ROTATE_SPEED = 0.4
const MARKER_COLOR = "#39e58c"

const GLOBE_BACKGROUND_STYLE = {
	background:
		"radial-gradient(circle at center, #123a2c 0%, #061410 55%, #020403 100%)",
	boxShadow: "0 0 24px 4px rgba(57, 229, 140, 0.18)",
}

export interface WeatherGlobeProps {
	latitude?: number
	longitude?: number
}

function getCameraTarget(
	capability: ReturnType<typeof useGlobeCapability>,
	latitude: number | undefined,
	longitude: number | undefined,
) {
	if (capability !== "webgl") return undefined
	if (latitude === undefined || longitude === undefined) return undefined
	return { lat: latitude, lng: longitude }
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

export function WeatherGlobe({ latitude, longitude }: WeatherGlobeProps) {
	const capability = useGlobeCapability()
	const globeRef = useRef<GlobeMethods | undefined>(undefined)
	const [hasLostContext, setHasLostContext] = useState(false)
	const globeMaterial = useMemo(
		() => new MeshPhongMaterial({ color: GLOBE_SURFACE_COLOR }),
		[],
	)

	useEffect(() => {
		if (capability !== "webgl") return
		const globe = globeRef.current
		if (!globe) return
		const controls = globe.controls()
		controls.autoRotate = true
		controls.autoRotateSpeed = AUTO_ROTATE_SPEED
		controls.enabled = false
		return () => {
			controls.autoRotate = false
			globe.renderer().forceContextLoss()
		}
	}, [capability])

	useEffect(() => {
		if (capability !== "webgl") return
		const globe = globeRef.current
		if (!globe) return
		const canvas = globe.renderer().domElement
		const handleContextLost = () => setHasLostContext(true)
		canvas.addEventListener("webglcontextlost", handleContextLost)
		return () =>
			canvas.removeEventListener("webglcontextlost", handleContextLost)
	}, [capability])

	useEffect(() => {
		const target = getCameraTarget(capability, latitude, longitude)
		if (!target) return
		const globe = globeRef.current
		if (!globe) return
		globe.pointOfView(
			{ lat: target.lat, lng: target.lng, altitude: CAMERA_ALTITUDE },
			CAMERA_TRANSITION_MS,
		)
	}, [capability, latitude, longitude])

	if (capability !== "webgl" || hasLostContext) {
		return <WeatherGlobeFallback />
	}

	const markerData =
		latitude === undefined || longitude === undefined
			? []
			: [{ lat: latitude, lng: longitude }]

	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-canvas"
			className="mx-auto h-32 w-32 overflow-hidden rounded-full"
			style={GLOBE_BACKGROUND_STYLE}
		>
			<Globe
				ref={globeRef}
				width={GLOBE_SIZE_PX}
				height={GLOBE_SIZE_PX}
				backgroundColor="rgba(0,0,0,0)"
				globeMaterial={globeMaterial}
				enablePointerInteraction={false}
				pointsData={markerData}
				pointColor={() => MARKER_COLOR}
				pointRadius={0.4}
				pointAltitude={0.01}
			/>
		</div>
	)
}
