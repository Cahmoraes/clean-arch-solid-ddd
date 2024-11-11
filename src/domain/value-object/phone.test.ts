import { InvalidPhoneNumberError } from '../error/invalid-phone-number-error'
import { Phone } from './phone'

describe('Phone', () => {
  test('Deve criar um telefone a partir de uma string', () => {
    const phoneNumber = '971457899'
    const phone = Phone.create(phoneNumber)
    expect(phone.isRight()).toBeTruthy()
    expect(phone.value.toString()).toBe(phoneNumber)
    expect(phone.forceRight().value.value).toBe(Number(phoneNumber))
  })

  test('Deve criar um telefone a partir de um número', () => {
    const phoneNumber = 971457899
    const phone = Phone.create(phoneNumber)
    expect(phone.isRight()).toBeTruthy()
    expect(phone.value.toString()).toBe(phoneNumber.toString())
    expect(phone.forceRight().value.value).toBe(phoneNumber)
  })

  test('Deve falhar ao criar um telefone a partir de uma string inválida', () => {
    const invalidPhoneNumber = 'invalid'
    const phone = Phone.create(invalidPhoneNumber)
    expect(phone.isLeft()).toBeTruthy()
    expect(phone.value).toBeInstanceOf(InvalidPhoneNumberError)
  })

  test('Deve falhar ao criar um telefone a partir de um valor NaN', () => {
    const invalidPhoneNumber = NaN
    const phone = Phone.create(invalidPhoneNumber)
    expect(phone.isLeft()).toBeTruthy()
    expect(phone.value).toBeInstanceOf(InvalidPhoneNumberError)
  })

  test('Deve criar um telefone a partir de um valor undefined', () => {
    const undefinedNumber = undefined
    const phone = Phone.create(undefinedNumber as any)
    expect(phone.isRight()).toBeTruthy()
    expect(phone.forceRight().value.value).toBeUndefined()
  })

  test('Deve falhar ao criar um telefone a partir de um valor null', () => {
    const invalidPhoneNumber = null
    const phone = Phone.create(invalidPhoneNumber as any)
    expect(phone.isLeft()).toBeTruthy()
    expect(phone.value).toBeInstanceOf(InvalidPhoneNumberError)
  })

  test('Deve restaurar um telefone a partir de um valor válido', () => {
    const phoneNumber = 971457899
    const phone = Phone.restore(phoneNumber)
    expect(phone.value).toBe(phoneNumber)
  })
})
