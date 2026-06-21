import { afterEach, describe, expect, test } from "vitest"
import {
	parseSidebarCollapseCookie,
	SIDEBAR_COLLAPSE_COOKIE,
	writeSidebarCollapseCookie,
} from "./sidebar-collapse-cookie"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: helper de limpeza de cookie em testes
	document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=; path=/; max-age=0`
}

afterEach(clearCookie)

describe("sidebar-collapse-cookie", () => {
	test("interpreta valor ausente como expandido (false)", () => {
		expect(parseSidebarCollapseCookie(undefined)).toBe(false)
	})

	test('interpreta "0" como expandido e "1" como recolhido', () => {
		expect(parseSidebarCollapseCookie("0")).toBe(false)
		expect(parseSidebarCollapseCookie("1")).toBe(true)
	})

	test("escreve o cookie de recolhimento com o valor 1", () => {
		writeSidebarCollapseCookie(true)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=1`)
	})

	test("escreve o cookie de recolhimento com o valor 0", () => {
		writeSidebarCollapseCookie(false)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=0`)
	})
})
