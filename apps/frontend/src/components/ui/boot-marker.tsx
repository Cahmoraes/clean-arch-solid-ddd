"use client"
import { useEffect } from "react"
import { markBootPlayed } from "@/lib/boot-session"

function isBootTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && target.hasAttribute("data-boot")
}

export function BootMarker() {
	useEffect(() => {
		function handleAnimationEnd(event: AnimationEvent): void {
			if (!isBootTarget(event.target)) return
			markBootPlayed()
		}
		document.addEventListener("animationend", handleAnimationEnd)
		return () =>
			document.removeEventListener("animationend", handleAnimationEnd)
	}, [])
	return null
}
