import { useSyncExternalStore } from "react"

export const MOTION_PAUSED_STORAGE_KEY = "volt:scene-motion-paused"
const MOTION_PAUSED_ATTR = "data-motion-paused"

type Listener = () => void

let memoryPaused = false

function readStorageValue(): boolean {
	if (typeof window === "undefined") return false
	try {
		return window.localStorage.getItem(MOTION_PAUSED_STORAGE_KEY) === "true"
	} catch {
		return memoryPaused
	}
}

function writeStorageValue(paused: boolean): void {
	if (typeof window === "undefined") return
	try {
		if (paused) {
			window.localStorage.setItem(MOTION_PAUSED_STORAGE_KEY, "true")
		} else {
			window.localStorage.removeItem(MOTION_PAUSED_STORAGE_KEY)
		}
	} catch {
		// armazenamento bloqueado: a pausa continua valendo só em memória (FR-018)
	}
}

function mirrorAttribute(paused: boolean): void {
	if (typeof document === "undefined") return
	document.documentElement.toggleAttribute(MOTION_PAUSED_ATTR, paused)
}

memoryPaused = readStorageValue()

const listeners = new Set<Listener>()

function notify(): void {
	for (const listener of listeners) listener()
}

export function readMotionPaused(): boolean {
	return memoryPaused
}

export function setMotionPaused(paused: boolean): void {
	memoryPaused = paused
	writeStorageValue(paused)
	mirrorAttribute(paused)
	notify()
}

function handleStorageEvent(event: StorageEvent): void {
	if (event.key !== null && event.key !== MOTION_PAUSED_STORAGE_KEY) return
	memoryPaused = readStorageValue()
	mirrorAttribute(memoryPaused)
	notify()
}

function subscribe(listener: Listener): () => void {
	listeners.add(listener)
	window.addEventListener("storage", handleStorageEvent)
	return () => {
		listeners.delete(listener)
		window.removeEventListener("storage", handleStorageEvent)
	}
}

function getSnapshot(): boolean {
	return memoryPaused
}

function getServerSnapshot(): boolean {
	return false
}

export function useMotionPreference(): {
	paused: boolean
	toggle: () => void
} {
	const paused = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
	function toggle(): void {
		setMotionPaused(!paused)
	}
	return { paused, toggle }
}
