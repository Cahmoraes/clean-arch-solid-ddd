import { vi } from "vitest"

type MediaListener = (event: MediaQueryListEvent) => void

export function mockMatchMedia(initialMatches: boolean) {
	const listeners = new Set<MediaListener>()
	const query = {
		matches: initialMatches,
		media: "",
		addEventListener: (_type: string, listener: MediaListener) => {
			listeners.add(listener)
		},
		removeEventListener: (_type: string, listener: MediaListener) => {
			listeners.delete(listener)
		},
	}
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue(query as unknown as MediaQueryList),
	)
	return {
		emit: (matches: boolean) => {
			query.matches = matches
			for (const listener of listeners) {
				listener({ matches } as MediaQueryListEvent)
			}
		},
		hasListeners: () => listeners.size > 0,
	}
}

export function mockIntersectionObserver() {
	const instances = new Set<FakeIntersectionObserver>()

	class FakeIntersectionObserver {
		callback: IntersectionObserverCallback

		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback
			instances.add(this)
		}

		observe() {}
		unobserve() {}
		disconnect() {
			instances.delete(this)
		}
	}

	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
	return {
		emit: (isIntersecting: boolean) => {
			for (const observer of instances) {
				observer.callback(
					[{ isIntersecting } as IntersectionObserverEntry],
					observer as unknown as IntersectionObserver,
				)
			}
		},
		activeObservers: () => instances.size,
	}
}

export function mockBlockedLocalStorage(): void {
	const blocked = () => {
		throw new DOMException("O armazenamento está bloqueado", "SecurityError")
	}
	vi.stubGlobal("localStorage", {
		getItem: blocked,
		setItem: blocked,
		removeItem: blocked,
		clear: blocked,
	})
}
