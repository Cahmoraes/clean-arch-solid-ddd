import { InvalidIdError } from "../error/invalid-id-error"
import { ExistingId } from "./existing-id"

const validUUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"

describe("ValidId", () => {
	test("Teve criar um ID", () => {
		const result = ExistingId.create(validUUID)
		expect(result.value).toBeInstanceOf(ExistingId)
		const id = result.force.success().value
		expect(id.value).toBe(validUUID)
	})

	test("Não deve criar um ID com um valor que não seja um UUID válido", () => {
		const invalidUUID = "any_id"
		const result = ExistingId.create(invalidUUID)
		expect(result.value).instanceOf(InvalidIdError)
	})

	test("Deve restaurar um ID", () => {
		const idValue = "any_id"
		const id = ExistingId.restore(idValue)
		expect(id.value).toBe(idValue)
	})

	test("Deve comparar dois IDs válidos e retornar true se forem iguais", () => {
		const idValue = validUUID
		const idOne = ExistingId.create(idValue).force.success().value
		const idTwo = ExistingId.create(idValue).force.success().value
		const result = idOne.equals(idTwo)
		expect(result).toBeTruthy()
	})

	test("Deve comparar dois IDs válidos e retornar false se forem diferentes", () => {
		const idValueOne = validUUID
		const idValueTwo = "f47ac10b-58cc-4372-a567-0e02b2c3d000"
		const idOne = ExistingId.create(idValueOne).force.success().value
		const idTwo = ExistingId.create(idValueTwo).force.success().value
		const result = idOne.equals(idTwo)
		expect(result).toBeFalsy()
	})

	test("Deve retornar false se o ID passado para comparação não for um ID", () => {
		const idValueOne = validUUID
		const idValueTwo = validUUID
		const idOne = ExistingId.create(idValueOne).forceSuccess().value
		const idTwo = {
			_value: idValueTwo,
		} as unknown as ExistingId
		const result = idOne.equals(idTwo)
		expect(result).toBeFalsy()
	})

	test("Deve lançar um erro ao tentar criar um ID inválido", () => {
		const result = ExistingId.create("")
		expect(result.value).instanceOf(InvalidIdError)
	})
})
