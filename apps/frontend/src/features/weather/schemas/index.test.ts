import { describe, expect, test } from "vitest"
import { citySchema } from "./index"

describe("citySchema", () => {
	test("aceita um nome de cidade válido", () => {
		const result = citySchema.safeParse({ city: "São Paulo" })

		expect(result.success).toBe(true)
		expect(result.success && result.data.city).toBe("São Paulo")
	})

	test("rejeita string vazia com a mensagem correta", () => {
		const result = citySchema.safeParse({ city: "" })

		expect(result.success).toBe(false)
		expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
			"Informe o nome de uma cidade.",
		)
	})

	test("rejeita string só com espaços em branco", () => {
		const result = citySchema.safeParse({ city: "   " })

		expect(result.success).toBe(false)
		expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
			"Informe o nome de uma cidade.",
		)
	})

	test("rejeita string com mais de 100 caracteres", () => {
		const result = citySchema.safeParse({ city: "a".repeat(101) })

		expect(result.success).toBe(false)
		expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
			"Nome de cidade muito longo.",
		)
	})
})
