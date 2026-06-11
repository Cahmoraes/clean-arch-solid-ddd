import { Id } from "./id"

describe("Id", () => {
	test("Deve criar um ID gerando UUID quando nenhum valor for informado", () => {
		const id = Id.create()
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		expect(id.value).toMatch(uuidRegex)
	})

	test("Deve criar um ID com um valor definido", () => {
		const idValue = "any_id"
		const id = Id.create(idValue)
		expect(id.value).toBe(idValue)
	})

	test("Deve restaurar um ID", () => {
		const idValue = "any_id"
		const id = Id.restore(idValue)
		expect(id.value).toBe(idValue)
	})

	test("Deve comparar dois IDs e retornar true se forem iguais", () => {
		const idValue = "any_id"
		const idOne = Id.create(idValue)
		const idTwo = Id.create(idValue)
		const result = idOne.equals(idTwo)
		expect(result).toBeTruthy()
	})

	test("Deve comparar dois IDs e retornar false se forem diferentes", () => {
		const idValueOne = "idOne"
		const idValueTwo = "idTwo"
		const idOne = Id.create(idValueOne)
		const idTwo = Id.create(idValueTwo)
		const result = idOne.equals(idTwo)
		expect(result).toBeFalsy()
	})

	test("Deve retornar false se o ID passado para comparação não for um ID", () => {
		const idValueOne = "idOne"
		const idValueTwo = "idTwo"
		const idOne = Id.create(idValueOne)
		const idTwo = {
			_value: idValueTwo,
		} as unknown as Id
		const result = idOne.equals(idTwo)
		expect(result).toBeFalsy()
	})
})
