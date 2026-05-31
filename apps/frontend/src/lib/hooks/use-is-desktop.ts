"use client"

import { useEffect, useState } from "react"

const DESKTOP_QUERY = "(min-width: 768px)"

function getMatch(): boolean {
	if (typeof window === "undefined" || !window.matchMedia) return true
	return window.matchMedia(DESKTOP_QUERY).matches
}

export function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState<boolean>(getMatch)

	useEffect(() => {
		const mql = window.matchMedia(DESKTOP_QUERY)
		const handleChange = (event: MediaQueryListEvent) => {
			setIsDesktop(event.matches)
		}
		setIsDesktop(mql.matches)
		mql.addEventListener("change", handleChange)
		return () => mql.removeEventListener("change", handleChange)
	}, [])

	return isDesktop
}
