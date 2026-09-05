"use client"

import { useEffect, useState } from "react"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export type GlobeCapability = "webgl" | "fallback"

function isWebglSupported(): boolean {
	try {
		const canvas = document.createElement("canvas")
		return Boolean(canvas.getContext("webgl") ?? canvas.getContext("webgl2"))
	} catch {
		return false
	}
}

function resolveCapability(prefersReducedMotion: boolean): GlobeCapability {
	if (prefersReducedMotion) return "fallback"
	return isWebglSupported() ? "webgl" : "fallback"
}

export function useGlobeCapability(): GlobeCapability {
	const [capability, setCapability] = useState<GlobeCapability>("fallback")

	useEffect(() => {
		const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY)
		const handleChange = (event: MediaQueryListEvent) => {
			setCapability(resolveCapability(event.matches))
		}
		setCapability(resolveCapability(mediaQueryList.matches))
		mediaQueryList.addEventListener("change", handleChange)
		return () => mediaQueryList.removeEventListener("change", handleChange)
	}, [])

	return capability
}
