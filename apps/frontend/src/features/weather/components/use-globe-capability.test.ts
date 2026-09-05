import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useGlobeCapability } from "./use-globe-capability"

function stubMatchMedia(initialMatches: boolean) {
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	const mediaQueryList = {
		matches: initialMatches,
		addEventListener: (
			_type: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.add(listener)
		},
		removeEventListener: (
			_type: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.delete(listener)
		},
	}
	vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mediaQueryList))
	return function emitChange(matches: boolean) {
		mediaQueryList.matches = matches
		for (const listener of listeners) {
			listener({ matches } as MediaQueryListEvent)
		}
	}
}

function stubWebgl(available: boolean) {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		available ? ({} as unknown as RenderingContext) : null,
	)
}

describe("useGlobeCapability", () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	test("retorna 'webgl' quando WebGL está disponível e reduced-motion não está ativo", () => {
		stubWebgl(true)
		stubMatchMedia(false)

		const { result } = renderHook(() => useGlobeCapability())

		expect(result.current).toBe("webgl")
	})

	test("retorna 'fallback' quando WebGL não está disponível", () => {
		stubWebgl(false)
		stubMatchMedia(false)

		const { result } = renderHook(() => useGlobeCapability())

		expect(result.current).toBe("fallback")
	})

	test("retorna 'fallback' quando prefers-reduced-motion está ativo mesmo com WebGL disponível", () => {
		stubWebgl(true)
		stubMatchMedia(true)

		const { result } = renderHook(() => useGlobeCapability())

		expect(result.current).toBe("fallback")
	})

	test("passa para 'fallback' quando o usuário ativa prefers-reduced-motion depois da montagem", () => {
		stubWebgl(true)
		const emitChange = stubMatchMedia(false)

		const { result } = renderHook(() => useGlobeCapability())
		act(() => {
			emitChange(true)
		})

		expect(result.current).toBe("fallback")
	})
})
