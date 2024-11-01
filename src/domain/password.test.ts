import { Password } from './password'

describe('Password test unit', () => {
  test('Deve criar um password', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    expect(password.value).toEqual(expect.any(String))
    expect(password.value).not.toBe(fakePassword)
  })

  test('Deve restaurar um password', () => {
    const fakePassword = 'any_password'
    const password = Password.restore(fakePassword)
    expect(password.value).toBe(fakePassword)
  })

  test('Deve comparar um password igual e retornar true', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    const result = password.compare(fakePassword)
    expect(result).toBe(true)
  })

  test('Deve comparar um password diferente e retornar false', () => {
    const fakePassword = 'any_password'
    const password = Password.create(fakePassword)
    const result = password.compare('other_password')
    expect(result).toBe(false)
  })
})
