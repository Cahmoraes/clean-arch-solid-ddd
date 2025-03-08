import { Email } from '../user/value-object/email'
import { Name } from '../user/value-object/name'
import { Result } from './result'
import { type Either, failure, success } from './value-object/either'

describe('Result Entity', () => {
  test('Deve criar um Result', () => {
    const successResult: Either<any, string> = success('ok')
    const result = Result.try(successResult)
    expect(result).toBeDefined()
  })

  test('Deve criar um Result válido', () => {
    const successResult: Either<any, string> = success('ok')
    const result = Result.try(successResult)
    expect(result.isValid).toBe(true)
    expect(result).toBeInstanceOf(Result)
  })

  test('Deve criar um Result inválido com um error', () => {
    const AnyErrorOne = failure(new Error('any_error_one'))
    const result = Result.try(AnyErrorOne)
    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([AnyErrorOne.value])
  })

  test('Deve executar um Result', () => {
    const name = Name.create('caique')
    const result = Result.try(name)
    expect(result.isValid).toBe(true)
  })

  test('Deve executar um Result', () => {
    const successResult: Either<any, null> = success(null)
    const result = Result.try(successResult)
    expect(result.isValid).toBe(true)
  })

  test('Deve criar um Result inválido com um array de erros', () => {
    const AnyErrorOne = failure(new Error('any_error_one'))
    const AnyErrorTwo = failure(new Error('any_error_two'))
    const result = Result.combine([AnyErrorOne, AnyErrorTwo])
    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([AnyErrorOne.value, AnyErrorTwo.value])
  })

  test('Deve criar um Result válido com um array', () => {
    const nameResult = Name.create('caique')
    const emailResult = Email.create('caique@test.com.br')
    const result = Result.combine([nameResult, emailResult])
    expect(result.isValid).toBe(true)
  })
})
