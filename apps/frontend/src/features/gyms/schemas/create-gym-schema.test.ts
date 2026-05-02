import { describe, expect, it } from "vitest"
import { createGymSchema } from "./create-gym-schema"

const validInput = {
	title: "Iron Gym",
	cnpj: "12345678000100",
	description: "A great gym",
	phone: "11999999999",
	latitude: -23.5505,
	longitude: -46.6333,
}

describe("createGymSchema", () => {
	it("aceita payload válido completo", () => {
		const result = createGymSchema.safeParse(validInput)
		expect(result.success).toBe(true)
	})

	it("rejeita nome vazio", () => {
		const result = createGymSchema.safeParse({ ...validInput, title: "" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === "title")).toBe(true)
		}
	})

	it("rejeita telefone com formato inválido (letras)", () => {
		const result = createGymSchema.safeParse({
			...validInput,
			phone: "11abc999",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === "phone")).toBe(true)
		}
	})

	it("rejeita CNPJ com tamanho diferente de 14 dígitos", () => {
		const result = createGymSchema.safeParse({ ...validInput, cnpj: "12345" })
		expect(result.success).toBe(false)
	})

	it("rejeita latitude fora do intervalo [-90, 90]", () => {
		const result = createGymSchema.safeParse({ ...validInput, latitude: 91 })
		expect(result.success).toBe(false)
	})

	it("aceita description e phone opcionais (string vazia)", () => {
		const result = createGymSchema.safeParse({
			...validInput,
			description: "",
			phone: "",
		})
		expect(result.success).toBe(true)
	})
})
