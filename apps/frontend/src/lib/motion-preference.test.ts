import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { mockBlockedLocalStorage } from "@/test/browser-mocks"
import {
	MOTION_PAUSED_STORAGE_KEY,
	readMotionPaused,
	setMotionPaused,
	useMotionPreference,
} from "./motion-preference"

describe("motion-preference", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
		setMotionPaused(false)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test("persiste a pausa no localStorage e espelha o atributo data-motion-paused no html", () => {
		setMotionPaused(true)
		expect(localStorage.getItem(MOTION_PAUSED_STORAGE_KEY)).toBe("true")
		expect(document.documentElement.hasAttribute("data-motion-paused")).toBe(
			true,
		)
	})

	test("reidrata a pausa quando outra aba grava no localStorage (evento storage)", () => {
		const { result } = renderHook(() => useMotionPreference())
		act(() => {
			localStorage.setItem(MOTION_PAUSED_STORAGE_KEY, "true")
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: MOTION_PAUSED_STORAGE_KEY,
					newValue: "true",
				}),
			)
		})
		expect(result.current.paused).toBe(true)
	})

	test("com dois subscribers, desinscrever um mantém o outro recebendo o evento storage", () => {
		const first = renderHook(() => useMotionPreference())
		const second = renderHook(() => useMotionPreference())
		first.unmount()
		act(() => {
			localStorage.setItem(MOTION_PAUSED_STORAGE_KEY, "true")
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: MOTION_PAUSED_STORAGE_KEY,
					newValue: "true",
				}),
			)
		})
		expect(second.result.current.paused).toBe(true)
	})

	test("com localStorage bloqueado, a pausa alterna só em memória e não lança exceção", () => {
		mockBlockedLocalStorage()
		expect(() => setMotionPaused(true)).not.toThrow()
		expect(readMotionPaused()).toBe(true)
		expect(document.documentElement.hasAttribute("data-motion-paused")).toBe(
			true,
		)
	})
})
