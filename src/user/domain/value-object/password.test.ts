import { ValidationError } from 'zod-validation-error'

import { Password } from './password'

describe('Password test unit', () => {
  test('Deve criar um password', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    expect(password.force.success().value.value).toEqual(expect.any(String))
    expect(password.force.success().value.value).not.toBe(fakePassword)
  })

  test('Deve restaurar um password', () => {
    const fakePassword = 'any_password'
    const password = Password.restore(fakePassword)
    expect(password.value).toBe(fakePassword)
  })

  test('Não deve criar um password com menos de 6 caracteres', () => {
    const fakePassword = ''
    const password = Password.create(fakePassword)
    expect(password.forceFailure().value).instanceOf(ValidationError)
    expect(password.forceFailure().value.message).toBe(
      'Validation error: String must contain at least 6 character(s)',
    )
  })

  test('Deve comparar um password igual e retornar true', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    const result = password.force.success().value.compare(fakePassword)
    expect(result).toBe(true)
  })

  test('Deve comparar um password diferente e retornar false', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    const result = password.force.success().value.compare('other_password')
    expect(result).toBe(false)
  })
})
