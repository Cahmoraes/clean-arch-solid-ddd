import { isAdult } from "./is-adult"

describe("isAdult", () => {
	test("Deve verificar se é adulto e retornar verdadeiro", () => {
		expect(isAdult(19)).toBe(true)
	})

	test("Deve verificar se é adulto e retornar verdadeiro", () => {
		expect(isAdult(18)).toBe(true)
	})

	test("Deve verificar se é adulto e retornar false", () => {
		expect(isAdult(17)).toBe(false)
	})
})
