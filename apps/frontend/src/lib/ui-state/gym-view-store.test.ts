import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { GYM_VIEW_COOKIE } from "./gym-view-cookie"
import { useGymViewStore } from "./gym-view-store"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: happy-dom não deleta cookie com max-age=0; usar expires no passado
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

beforeEach(() => {
	useGymViewStore.setState({ view: "cards", hydrated: false })
	clearCookie()
})

afterEach(clearCookie)

describe("useGymViewStore", () => {
	test("inicia com view cards", () => {
		expect(useGymViewStore.getState().view).toBe("cards")
	})

	test("toggle alterna entre cards e rows e grava o cookie", () => {
		useGymViewStore.getState().toggle()
		expect(useGymViewStore.getState().view).toBe("rows")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=rows`)

		useGymViewStore.getState().toggle()
		expect(useGymViewStore.getState().view).toBe("cards")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=cards`)
	})

	test("setView define explicitamente a view e grava o cookie", () => {
		useGymViewStore.getState().setView("rows")
		expect(useGymViewStore.getState().view).toBe("rows")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=rows`)
	})

	test("hydrate só aplica na primeira chamada", () => {
		useGymViewStore.getState().hydrate("rows")
		expect(useGymViewStore.getState().view).toBe("rows")

		useGymViewStore.getState().hydrate("cards")
		expect(useGymViewStore.getState().view).toBe("rows")
	})

	test("hydrate não grava cookie", () => {
		useGymViewStore.getState().hydrate("rows")
		expect(document.cookie).not.toContain(GYM_VIEW_COOKIE)
	})
})
