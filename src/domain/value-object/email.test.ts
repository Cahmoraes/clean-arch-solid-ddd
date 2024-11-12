import { InvalidEmailError } from '../error/invalid-email-error'
import { Email } from './email'

describe('Email', () => {
  test('Deve criar um email válido', () => {
    const emailOrError = Email.create('valid.email@example.com')
    expect(emailOrError.isRight()).toBeTruthy()
    expect(emailOrError.forceRight().value.value).toBe(
      'valid.email@example.com',
    )
  })

  test('Deve falhar ao criar um email inválido', () => {
    const emailOrError = Email.create('invalid-email')
    expect(emailOrError.isLeft()).toBeTruthy()
    expect(emailOrError.forceLeft().value).toBeInstanceOf(InvalidEmailError)
  })

  test('Deve restaurar um email', () => {
    const email = Email.restore('restored.email@example.com')
    expect(email.value).toBe('restored.email@example.com')
  })
})
