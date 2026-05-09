import { GoogleId } from "./google-id.js"

describe("GoogleId", () => {
	test("Deve criar um GoogleId válido", () => {
		const result = GoogleId.create("1234567890")
		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value.value).toBe("1234567890")
	})

	test("Não deve criar um GoogleId com string vazia", () => {
		const result = GoogleId.create("")
		expect(result.isFailure()).toBe(true)
	})

	test("Deve restaurar um GoogleId", () => {
		const googleId = GoogleId.restore("1234567890")
		expect(googleId.value).toBe("1234567890")
	})
})
