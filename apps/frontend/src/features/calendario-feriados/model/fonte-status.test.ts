import { describe, expect, test } from "vitest"
import { statusDaFonte } from "./fonte-status"

describe("statusDaFonte", () => {
	test("pendente sem dados é carregando", () => {
		expect(
			statusDaFonte({ isPending: true, isError: false, hasData: false }),
		).toBe("carregando")
	})
	test("falha sem dados é erro", () => {
		expect(
			statusDaFonte({ isPending: false, isError: true, hasData: false }),
		).toBe("erro")
	})
	test("falha de refetch com dados em cache continua ok", () => {
		expect(
			statusDaFonte({ isPending: false, isError: true, hasData: true }),
		).toBe("ok")
	})
	test("pendente com dados em cache é ok", () => {
		expect(
			statusDaFonte({ isPending: true, isError: false, hasData: true }),
		).toBe("ok")
	})
	test("com dados e sem pendência nem falha é ok", () => {
		expect(
			statusDaFonte({ isPending: false, isError: false, hasData: true }),
		).toBe("ok")
	})
})
