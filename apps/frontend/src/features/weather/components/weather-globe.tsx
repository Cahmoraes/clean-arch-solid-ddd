"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Globe, { type GlobeMethods } from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import type { GlobeCapability } from "./use-globe-capability"
import { useGlobeCapability } from "./use-globe-capability"
import {
	GLOBE_BACKGROUND_STYLE,
	GLOBE_SIZE_PX,
	type WeatherGlobeProps,
} from "./weather-globe-constants"
import { WeatherGlobeFallback } from "./weather-globe-fallback"

const GLOBE_SURFACE_COLOR = "#061410"
const CAMERA_ALTITUDE = 1.5
const CAMERA_TRANSITION_MS = 1000
const AUTO_ROTATE_SPEED = 0.4
const MARKER_COLOR = "#39e58c"

function getCameraTarget(
	capability: GlobeCapability,
	latitude: number | undefined,
	longitude: number | undefined,
) {
	if (capability !== "webgl") return undefined
	if (latitude === undefined || longitude === undefined) return undefined
	return { lat: latitude, lng: longitude }
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
		// `controls.enabled` precisa continuar `true`: o loop de render só chama
		// `controls.update()` quando os controles estão habilitados, e é dentro de
		// `update()` que a auto-rotação é aplicada. A interação por mouse/touch é
		// desligada pelos flags abaixo, que gateiam apenas os event handlers.
		controls.enableZoom = false
		controls.enablePan = false
		controls.enableRotate = false
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
		const handleContextLost = (event: Event) => {
			event.preventDefault()
			setHasLostContext(true)
		}
		canvas.addEventListener("webglcontextlost", handleContextLost)
		return () =>
			canvas.removeEventListener("webglcontextlost", handleContextLost)
	}, [capability])

	useEffect(() => {
		const target = getCameraTarget(capability, latitude, longitude)
		if (!target) return
		const globe = globeRef.current
		if (!globe) return
		// A auto-rotação é pausada durante a transição de câmera, senão o globo
		// continuaria girando e a cidade buscada passaria direto pelo enquadramento.
		const controls = globe.controls()
		controls.autoRotate = false
		globe.pointOfView(
			{ lat: target.lat, lng: target.lng, altitude: CAMERA_ALTITUDE },
			CAMERA_TRANSITION_MS,
		)
		const resumeTimeout = setTimeout(() => {
			controls.autoRotate = true
		}, CAMERA_TRANSITION_MS)
		return () => clearTimeout(resumeTimeout)
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
			className="mx-auto overflow-hidden rounded-full"
			style={{
				...GLOBE_BACKGROUND_STYLE,
				height: GLOBE_SIZE_PX,
				width: GLOBE_SIZE_PX,
			}}
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
