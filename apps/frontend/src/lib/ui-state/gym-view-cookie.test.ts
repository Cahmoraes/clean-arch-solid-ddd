import { afterEach, describe, expect, test } from "vitest"
import {
	GYM_VIEW_COOKIE,
	parseGymViewCookie,
	writeGymViewCookie,
} from "./gym-view-cookie"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: helper de limpeza de cookie em testes
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; max-age=0`
}

afterEach(clearCookie)

describe("gym-view-cookie", () => {
	test("interpreta valor ausente como cards", () => {
		expect(parseGymViewCookie(undefined)).toBe("cards")
	})

	test("interpreta valor inválido como cards", () => {
		expect(parseGymViewCookie("qualquer-coisa")).toBe("cards")
	})

	test('interpreta "cards" e "rows" corretamente', () => {
		expect(parseGymViewCookie("cards")).toBe("cards")
		expect(parseGymViewCookie("rows")).toBe("rows")
	})

	test("escreve o cookie com a view cards", () => {
		writeGymViewCookie("cards")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=cards`)
	})

	test("escreve o cookie com a view rows", () => {
		writeGymViewCookie("rows")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=rows`)
	})
})
