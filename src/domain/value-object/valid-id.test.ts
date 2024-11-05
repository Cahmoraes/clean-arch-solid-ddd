import { ValidId } from './valid-id'

describe('ValidId', () => {
  test('Teve criar um ID', () => {
    const validId = 'validId'
    const id = ValidId.create(validId)
    expect(id.value).toBeDefined()
  })

  test('Deve criar um ID com um valor definido', () => {
    const idValue = 'any_id'
    const id = ValidId.create(idValue)
    expect(id.value).toBe(idValue)
  })

  test('Deve restaurar um ID', () => {
    const idValue = 'any_id'
    const id = ValidId.restore(idValue)
    expect(id.value).toBe(idValue)
  })

  test('Deve comparar dois IDs e retornar true se forem iguais', () => {
    const idValue = 'any_id'
    const idOne = ValidId.create(idValue)
    const idTwo = ValidId.create(idValue)
    const result = idOne.equals(idTwo)
    expect(result).toBeTruthy()
  })

  test('Deve comparar dois IDs e retornar false se forem diferentes', () => {
    const idValueOne = 'idOne'
    const idValueTwo = 'idTwo'
    const idOne = ValidId.create(idValueOne)
    const idTwo = ValidId.create(idValueTwo)
    const result = idOne.equals(idTwo)
    expect(result).toBeFalsy()
  })

  test('Deve retornar false se o ID passado para comparação não for um ID', () => {
    const idValueOne = 'idOne'
    const idValueTwo = 'idTwo'
    const idOne = ValidId.create(idValueOne)
    const idTwo = {
      _value: idValueTwo,
    } as unknown as ValidId
    const result = idOne.equals(idTwo)
    expect(result).toBeFalsy()
  })
})
