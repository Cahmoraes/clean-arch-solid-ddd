import { Name } from './name'

describe('Name', () => {
  test('Deve criar um Nome', () => {
    const nameOrError = Name.create('fake name').forceRight().value
    expect(nameOrError.value).toBe('fake name')
  })

  test('Deve restaurar um nome', () => {
    const fakeName = 'fake name'
    const name = Name.restore(fakeName)
    expect(name.value).toBe(fakeName)
  })

  test('Não deve criar um nome com quantidade de caracteres inválida', () => {
    const nameOrError = Name.create('')
    expect(nameOrError.value).toBeInstanceOf(Error)
  })
})
