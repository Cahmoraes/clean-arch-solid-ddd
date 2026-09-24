import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import {
	mockBlockedLocalStorage,
	mockIntersectionObserver,
	mockMatchMedia,
} from "@/test/browser-mocks"
import {
	SCENE_MOTION_STORAGE_KEY,
	setUserPause,
	useSceneMotion,
} from "./use-scene-motion"

function renderMotion() {
	const element = document.createElement("div")
	document.body.appendChild(element)
	const ref = { current: element }
	return renderHook(() => useSceneMotion(ref))
}

afterEach(() => {
	vi.unstubAllGlobals()
	window.localStorage.clear()
	act(() => setUserPause(false))
})

describe("useSceneMotion", () => {
	test("anima por padrão: sem pausa manual, sem movimento reduzido, cena visível", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
		expect(result.current.userPaused).toBe(false)
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

	test("toggleUserPause pausa, grava no navegador e alterna de volta", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { result } = renderMotion()
		act(() => result.current.toggleUserPause())
		expect(result.current.paused).toBe(true)
		expect(result.current.userPaused).toBe(true)
		expect(window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)).toBe("true")
		act(() => result.current.toggleUserPause())
		expect(result.current.paused).toBe(false)
		expect(window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)).toBe("false")
	})

	test("lê a escolha guardada ao montar", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		window.localStorage.setItem(SCENE_MOTION_STORAGE_KEY, "true")
		const { result } = renderMotion()
		expect(result.current.userPaused).toBe(true)
		expect(result.current.paused).toBe(true)
	})

	test("duas instâncias compartilham a mesma escolha manual", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const first = renderMotion()
		const second = renderMotion()
		act(() => first.result.current.toggleUserPause())
		expect(second.result.current.userPaused).toBe(true)
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

	test("armazenamento bloqueado na leitura e na escrita: anima, não lança e o toggle funciona na sessão", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		mockBlockedLocalStorage()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
		expect(() => act(() => result.current.toggleUserPause())).not.toThrow()
		expect(result.current.userPaused).toBe(true)
		expect(result.current.paused).toBe(true)
		act(() => result.current.toggleUserPause())
		expect(result.current.paused).toBe(false)
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
