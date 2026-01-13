import { beforeEach, describe, expect, it, vi } from "vitest"

import { Example } from "./example" // Ajuste o caminho conforme necessário

describe("Example", () => {
	let example: Example

	beforeEach(() => {
		example = new Example()
	})

	it("deve chamar performFetch ao chamar fetchTodos", () => {
		// Mock do método `performFetch`
		const performFetchSpy = vi
			.spyOn(example as any, "performFetch")
			.mockReturnValue([{ title: "mocked" }])

		const result = example.fetchTodos()

		// Verifica se `performFetch` foi chamado
		expect(performFetchSpy).toHaveBeenCalled()
		// Verifica se o retorno de `fetchTodos` é o esperado
		expect(result).toEqual([{ title: "mocked" }])

		// Limpa o mock após o teste
		performFetchSpy.mockRestore()
	})

	it("deve retornar o valor padrão de performFetch ao chamar fetchTodos sem mock", () => {
		const result = example.fetchTodos()

		// Verifica se `fetchTodos` retorna o valor padrão de `performFetch`
		expect(result).toEqual([{ title: "production" }])
	})
})
