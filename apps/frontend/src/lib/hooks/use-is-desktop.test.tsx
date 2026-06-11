import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useIsDesktop } from "./use-is-desktop"

type Listener = (event: MediaQueryListEvent) => void

function mockMatchMedia(initialMatches: boolean) {
	const listeners = new Set<Listener>()
	const mql = {
		matches: initialMatches,
		media: "(min-width: 768px)",
		addEventListener: (_type: string, listener: Listener) => {
			listeners.add(listener)
		},
		removeEventListener: (_type: string, listener: Listener) => {
			listeners.delete(listener)
		},
	}
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue(mql as unknown as MediaQueryList),
	)
	return {
		emit: (matches: boolean) => {
			mql.matches = matches
			for (const listener of listeners) {
				listener({ matches } as MediaQueryListEvent)
			}
		},
		hasListeners: () => listeners.size > 0,
	}
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("useIsDesktop", () => {
	test("retorna true quando o viewport corresponde a min-width 768px", () => {
		mockMatchMedia(true)
		const { result } = renderHook(() => useIsDesktop())
		expect(result.current).toBe(true)
	})

	test("retorna false quando o viewport é menor que 768px", () => {
		mockMatchMedia(false)
		const { result } = renderHook(() => useIsDesktop())
		expect(result.current).toBe(false)
	})

	test("atualiza o valor quando o media query muda", () => {
		const media = mockMatchMedia(false)
		const { result } = renderHook(() => useIsDesktop())
		expect(result.current).toBe(false)
		act(() => media.emit(true))
		expect(result.current).toBe(true)
	})

	test("remove o listener ao desmontar", () => {
		const media = mockMatchMedia(true)
		const { unmount } = renderHook(() => useIsDesktop())
		expect(media.hasListeners()).toBe(true)
		unmount()
		expect(media.hasListeners()).toBe(false)
	})
})
