import { InvalidIdError } from '../error/invalid-id-error'
import { ExistingId } from './existing-id'

describe('ValidId', () => {
  test('Teve criar um ID', () => {
    const validId = 'validId'
    const id = ExistingId.create(validId)
    expect(id.value).toBeDefined()
  })

  test('Deve criar um ID com um valor definido', () => {
    const idValue = 'any_id'
    const id = ExistingId.create(idValue)
    expect(id.value).toBe(idValue)
  })

  test('Deve restaurar um ID', () => {
    const idValue = 'any_id'
    const id = ExistingId.restore(idValue)
    expect(id.value).toBe(idValue)
  })

  test('Deve comparar dois IDs e retornar true se forem iguais', () => {
    const idValue = 'any_id'
    const idOne = ExistingId.create(idValue)
    const idTwo = ExistingId.create(idValue)
    const result = idOne.equals(idTwo)
    expect(result).toBeTruthy()
  })

  test('Deve comparar dois IDs e retornar false se forem diferentes', () => {
    const idValueOne = 'idOne'
    const idValueTwo = 'idTwo'
    const idOne = ExistingId.create(idValueOne)
    const idTwo = ExistingId.create(idValueTwo)
    const result = idOne.equals(idTwo)
    expect(result).toBeFalsy()
  })

  test('Deve retornar false se o ID passado para comparação não for um ID', () => {
    const idValueOne = 'idOne'
    const idValueTwo = 'idTwo'
    const idOne = ExistingId.create(idValueOne)
    const idTwo = {
      _value: idValueTwo,
    } as unknown as ExistingId
    const result = idOne.equals(idTwo)
    expect(result).toBeFalsy()
  })

  test('Deve lançar um erro ao tentar criar um ID inválido', () => {
    expect(() => ExistingId.create('')).toThrow(InvalidIdError)
  })
})
