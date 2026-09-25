import { beforeEach, describe, expect, test } from "vitest"
import { mockBlockedLocalStorage } from "@/test/browser-mocks"
import {
	BOOT_PLAYED_KEY,
	bootPrepaintScript,
	markBootPlayed,
} from "./boot-session"

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

	test("markBootPlayed grava a flag de sessão", () => {
		markBootPlayed()
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBe("true")
	})

	test("com storage bloqueado, o script não lança exceção", () => {
		mockBlockedLocalStorage()
		expect(() => runBootScript()).not.toThrow()
	})
})
