import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { mockBlockedLocalStorage, mockMatchMedia } from "@/test/browser-mocks"
import { BOOT_PLAYED_KEY, bootPrepaintScript } from "./boot-session"

function runBootScript(): void {
	new Function(bootPrepaintScript())()
}

describe("boot-session", () => {
	beforeEach(() => {
		sessionStorage.clear()
		localStorage.clear()
		document.documentElement.removeAttribute("data-boot-played")
		document.documentElement.removeAttribute("data-motion-paused")
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test("sem flag de sessão, não marca data-boot-played", () => {
		runBootScript()
		expect(document.documentElement.hasAttribute("data-boot-played")).toBe(
			false,
		)
	})

	test("com a flag de sessão gravada, marca data-boot-played", () => {
		sessionStorage.setItem(BOOT_PLAYED_KEY, "true")
		runBootScript()
		expect(document.documentElement.hasAttribute("data-boot-played")).toBe(true)
	})

	test("com a pausa salva no localStorage, marca data-motion-paused", () => {
		localStorage.setItem("volt:scene-motion-paused", "true")
		runBootScript()
		expect(document.documentElement.hasAttribute("data-motion-paused")).toBe(
			true,
		)
	})

	test("sem flag de sessão, sem pausa e sem reduced motion, o script já grava a flag de boot tocado antes da hidratação", () => {
		mockMatchMedia(false)
		runBootScript()
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBe("true")
	})

	test("com prefers-reduced-motion, o script não grava a flag de boot tocado", () => {
		mockMatchMedia(true)
		runBootScript()
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBeNull()
	})

	test("com a pausa salva no localStorage, o script não grava a flag de boot tocado", () => {
		mockMatchMedia(false)
		localStorage.setItem("volt:scene-motion-paused", "true")
		runBootScript()
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBeNull()
	})

	test("com storage bloqueado, o script não lança exceção", () => {
		mockBlockedLocalStorage()
		expect(() => runBootScript()).not.toThrow()
	})
})
