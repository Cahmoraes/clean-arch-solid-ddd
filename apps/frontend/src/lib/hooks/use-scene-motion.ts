import {
	type RefObject,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export interface SceneMotion {
	paused: boolean
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
	const reducedMotion = useSyncExternalStore(
		subscribeReducedMotion,
		getReducedMotionSnapshot,
		getServerReducedMotionSnapshot,
	)
	const visible = useIsVisible(ref)
	return { paused: reducedMotion || !visible }
}
