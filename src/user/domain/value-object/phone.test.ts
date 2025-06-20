import { InvalidPhoneNumberError } from '../error/invalid-phone-number-error'
import { Phone } from './phone'

describe('Phone', () => {
  test('Deve criar um telefone a partir de uma string com números', () => {
    const phoneNumber = '971457899'
    const phone = Phone.create(phoneNumber)
    expect(phone.isSuccess()).toBeTruthy()
    expect(phone.forceSuccess().value.value).toBe(phoneNumber)
  })

  test('Deve criar um telefone removendo caracteres especiais', () => {
    const phoneNumber = '(11) 97145-7899'
    const phone = Phone.create(phoneNumber)
    expect(phone.isSuccess()).toBeTruthy()
    expect(phone.forceSuccess().value.value).toBe('11971457899')
  })

  test('Deve criar um telefone com formato brasileiro', () => {
    const phoneNumber = '+55 11 97145-7899'
    const phone = Phone.create(phoneNumber)
    expect(phone.isSuccess()).toBeTruthy()
    expect(phone.forceSuccess().value.value).toBe('5511971457899')
  })

  test('Deve falhar ao criar um telefone a partir de uma string apenas com letras', () => {
    const invalidPhoneNumber = 'invalid'
    const phone = Phone.create(invalidPhoneNumber)
    expect(phone.isFailure()).toBeTruthy()
    expect(phone.value).toBeInstanceOf(InvalidPhoneNumberError)
  })

  test('Deve falhar ao criar um telefone a partir de string vazia', () => {
    const invalidPhoneNumber = ''
    const phone = Phone.create(invalidPhoneNumber)
    expect(phone.isFailure()).toBeTruthy()
    expect(phone.value).toBeInstanceOf(InvalidPhoneNumberError)
  })

  test('Deve falhar ao criar um telefone apenas com caracteres especiais', () => {
    const invalidPhoneNumber = '()- +'
    const phone = Phone.create(invalidPhoneNumber)
    expect(phone.isFailure()).toBeTruthy()
    expect(phone.value).toBeInstanceOf(InvalidPhoneNumberError)
  })

  test('Deve criar um telefone a partir de um valor undefined', () => {
    const undefinedNumber = undefined
    const phone = Phone.create(undefinedNumber as any)
    expect(phone.isSuccess()).toBeTruthy()
    expect(phone.forceSuccess().value.value).toBeUndefined()
  })

  test('Deve restaurar um telefone a partir de um valor válido', () => {
    const phoneNumber = '971457899'
    const phone = Phone.restore(phoneNumber)
    expect(phone.value).toBe(phoneNumber)
  })
})
