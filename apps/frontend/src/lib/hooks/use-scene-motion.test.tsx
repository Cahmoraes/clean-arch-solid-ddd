import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { mockIntersectionObserver, mockMatchMedia } from "@/test/browser-mocks"
import { useSceneMotion } from "./use-scene-motion"

function renderMotion() {
	const element = document.createElement("div")
	document.body.appendChild(element)
	const ref = { current: element }
	return renderHook(() => useSceneMotion(ref))
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("useSceneMotion", () => {
	test("anima por padrão: sem movimento reduzido, cena visível", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
	})

	test("pausa quando o sistema pede movimento reduzido e retoma quando deixa de pedir", () => {
		const media = mockMatchMedia(true)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(true)
		act(() => media.emit(false))
		expect(result.current.paused).toBe(false)
	})

	test("pausa quando a cena sai da tela e retoma quando volta", () => {
		mockMatchMedia(false)
		const observer = mockIntersectionObserver()
		const { result } = renderMotion()
		act(() => observer.emit(false))
		expect(result.current.paused).toBe(true)
		act(() => observer.emit(true))
		expect(result.current.paused).toBe(false)
	})

	test("desconecta o observador de visibilidade e o listener de matchMedia ao desmontar", () => {
		const media = mockMatchMedia(false)
		const observer = mockIntersectionObserver()
		const { unmount } = renderMotion()
		expect(observer.activeObservers()).toBe(1)
		expect(media.hasListeners()).toBe(true)
		unmount()
		expect(observer.activeObservers()).toBe(0)
		expect(media.hasListeners()).toBe(false)
	})

	test("matchMedia ausente: trata como sem movimento reduzido e não lança", () => {
		vi.stubGlobal("matchMedia", undefined)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
	})

	test("IntersectionObserver ausente: a cena é tratada como visível e não lança", () => {
		mockMatchMedia(false)
		vi.stubGlobal("IntersectionObserver", undefined)
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
	})
})
