import { ValidationError } from 'zod-validation-error'

import { type RestoreUserProps, User, type UserCreateProps } from './user'

describe('User Entity', () => {
  test('Deve criar um usuário', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceRight().value).toBeDefined()
    expect(userOrError.forceRight().value.name).toEqual(input.name)
    expect(userOrError.forceRight().value.email).toEqual(input.email)
    expect(userOrError.forceRight().value.password).toEqual(expect.any(String))
    expect(userOrError.forceRight().value.createdAt).toEqual(expect.any(Date))
    expect(userOrError.forceRight().value.id).toBeNull()
  })

  test('Deve restaurar um usuário', () => {
    const input: RestoreUserProps = {
      createdAt: new Date(),
      id: 'any_id',
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const user = User.restore(input)
    expect(user).toBeDefined()
    expect(user.id).toEqual(input.id)
    expect(user.name).toEqual(input.name)
    expect(user.email).toEqual(input.email)
    expect(user.password).toEqual(expect.any(String))
    expect(user.createdAt).toEqual(input.createdAt)
  })

  test('Não deve criar um usuário com nome inválido', () => {
    const input: UserCreateProps = {
      name: '',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceLeft().value).toBeInstanceOf(ValidationError)
    expect(userOrError.forceLeft().value.message).toEqual(
      'Validation error: String must contain at least 3 character(s) at "name"',
    )
  })

  test('Não deve criar um usuário com email inválido', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: '',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceLeft().value).toBeInstanceOf(ValidationError)
    expect(userOrError.forceLeft().value.message).toEqual(
      'Validation error: Invalid email at "email"',
    )
  })
})
