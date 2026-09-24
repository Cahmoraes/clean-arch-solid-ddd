import {
	type RefObject,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react"

export const SCENE_MOTION_STORAGE_KEY = "volt:scene-motion-paused"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export interface UserMotionPause {
	userPaused: boolean
	toggleUserPause: () => void
}

export interface SceneMotion extends UserMotionPause {
	paused: boolean
}

const listeners = new Set<() => void>()
let userPausedState = false

function readStoredPause(): boolean | null {
	try {
		const stored = window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)
		if (stored === "true") return true
		if (stored === "false") return false
		return null
	} catch {
		// Armazenamento indisponível ou bloqueado: sem escolha guardada, o padrão é animar.
		return null
	}
}

function writeStoredPause(paused: boolean): void {
	try {
		window.localStorage.setItem(SCENE_MOTION_STORAGE_KEY, String(paused))
	} catch {
		// Não foi possível persistir: a escolha continua valendo só nesta sessão.
	}
}

export function setUserPause(paused: boolean): void {
	userPausedState = paused
	writeStoredPause(paused)
	for (const listener of listeners) listener()
}

function toggleUserPause(): void {
	setUserPause(!userPausedState)
}

function subscribeUserPause(listener: () => void): () => void {
	if (listeners.size === 0) {
		const stored = readStoredPause()
		if (stored !== null) userPausedState = stored
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

function getUserPauseSnapshot(): boolean {
	return userPausedState
}

function getServerPauseSnapshot(): boolean {
	return false
}

export function useUserMotionPause(): UserMotionPause {
	const userPaused = useSyncExternalStore(
		subscribeUserPause,
		getUserPauseSnapshot,
		getServerPauseSnapshot,
	)
	return { userPaused, toggleUserPause }
}

function getReducedMotionQuery(): MediaQueryList | null {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return null
	}
	return window.matchMedia(REDUCED_MOTION_QUERY)
}

function noop(): void {
	// Sem API para assinar: nada a cancelar.
}

function subscribeReducedMotion(listener: () => void): () => void {
	const query = getReducedMotionQuery()
	if (!query) return noop
	query.addEventListener("change", listener)
	return () => query.removeEventListener("change", listener)
}

function getReducedMotionSnapshot(): boolean {
	return getReducedMotionQuery()?.matches ?? false
}

function getServerReducedMotionSnapshot(): boolean {
	return false
}

function useIsVisible(ref: RefObject<Element | null>): boolean {
	const [visible, setVisible] = useState(true)
	useEffect(() => {
		const element = ref.current
		if (!element || typeof IntersectionObserver === "undefined") {
			return undefined
		}
		const observer = new IntersectionObserver((entries) => {
			const latest = entries.at(-1)
			if (latest) setVisible(latest.isIntersecting)
		})
		observer.observe(element)
		return () => observer.disconnect()
	}, [ref])
	return visible
}

export function useSceneMotion(ref: RefObject<Element | null>): SceneMotion {
	const { userPaused, toggleUserPause: toggle } = useUserMotionPause()
	const reducedMotion = useSyncExternalStore(
		subscribeReducedMotion,
		getReducedMotionSnapshot,
		getServerReducedMotionSnapshot,
	)
	const visible = useIsVisible(ref)
	return {
		paused: userPaused || reducedMotion || !visible,
		userPaused,
		toggleUserPause: toggle,
	}
}
