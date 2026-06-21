import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { SIDEBAR_COLLAPSE_COOKIE } from "./sidebar-collapse-cookie"
import { useSidebarCollapseStore } from "./sidebar-collapse-store"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: happy-dom não deleta cookie com max-age=0; usar expires no passado
	document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

beforeEach(() => {
	useSidebarCollapseStore.setState({ collapsed: false })
	clearCookie()
})

afterEach(clearCookie)

describe("useSidebarCollapseStore", () => {
	test("inicia expandido (collapsed=false)", () => {
		expect(useSidebarCollapseStore.getState().collapsed).toBe(false)
	})

	test("toggle inverte o estado e grava o cookie", () => {
		useSidebarCollapseStore.getState().toggle()
		expect(useSidebarCollapseStore.getState().collapsed).toBe(true)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=1`)
	})

	test("setCollapsed define o estado e grava o cookie", () => {
		useSidebarCollapseStore.getState().setCollapsed(true)
		expect(useSidebarCollapseStore.getState().collapsed).toBe(true)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=1`)
	})

	test("hydrate seedeia o estado SEM gravar cookie", () => {
		useSidebarCollapseStore.getState().hydrate(true)
		expect(useSidebarCollapseStore.getState().collapsed).toBe(true)
		expect(document.cookie).not.toContain(SIDEBAR_COLLAPSE_COOKIE)
	})
})
