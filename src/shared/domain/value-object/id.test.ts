import { Id } from "./id"

describe("Id", () => {
	test("Teve criar um ID", () => {
		const id = Id.create()
		expect(id.value).toBeNull()
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
