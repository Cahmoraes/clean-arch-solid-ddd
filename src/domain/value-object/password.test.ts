import { Password } from './password'

describe('Password test unit', () => {
  test('Deve criar um password', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    expect(password.force.right().value.value).toEqual(expect.any(String))
    expect(password.force.right().value.value).not.toBe(fakePassword)
  })

  test('Deve restaurar um password', () => {
    const fakePassword = 'any_password'
    const password = Password.restore(fakePassword)
    expect(password.value).toBe(fakePassword)
  })

  test('Deve comparar um password igual e retornar true', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    const result = password.force.right().value.compare(fakePassword)
    expect(result).toBe(true)
  })

  test('Deve comparar um password diferente e retornar false', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    const result = password.force.right().value.compare('other_password')
    expect(result).toBe(false)
  })
})
