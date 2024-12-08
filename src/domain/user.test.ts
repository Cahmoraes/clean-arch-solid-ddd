import { InvalidEmailError } from './error/invalid-email-error'
import { InvalidNameLengthError } from './error/invalid-name-length-error'
import { User, type UserCreateProps, type UserRestoreProps } from './user'
import { RoleValues } from './value-object/role'

describe('User Entity', () => {
  test('Deve criar um usuário', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceSuccess().value).toBeDefined()
    expect(userOrError.forceSuccess().value.name).toEqual(input.name)
    expect(userOrError.forceSuccess().value.email).toEqual(input.email)
    expect(userOrError.forceSuccess().value.role).toBe(RoleValues.MEMBER)
    expect(userOrError.forceSuccess().value.password).toEqual(
      expect.any(String),
    )
    expect(userOrError.forceSuccess().value.createdAt).toEqual(expect.any(Date))
    expect(userOrError.forceSuccess().value.id).toBeNull()
  })

  test('Deve restaurar um usuário', () => {
    const input: UserRestoreProps = {
      createdAt: new Date(),
      id: 'any_id',
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      role: RoleValues.MEMBER,
    }
    const user = User.restore(input)
    expect(user).toBeDefined()
    expect(user.id).toEqual(input.id)
    expect(user.name).toEqual(input.name)
    expect(user.email).toEqual(input.email)
    expect(user.role).toEqual(input.role)
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
    expect(userOrError.forceFailure().value).toBeInstanceOf(
      InvalidNameLengthError,
    )
  })

  test('Não deve criar um usuário com email inválido', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: '',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceFailure().value).toBeInstanceOf(InvalidEmailError)
  })

  test('Deve criar um usuário com uma data de criação pré-definida', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      createdAt: new Date(),
    }
    const userOrError = User.create(input)
    expect(userOrError.forceSuccess().value.createdAt).toBe(input.createdAt)
  })

  test('Deve criar um usuário ADMINISTRADOR', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      role: 'ADMIN',
      createdAt: new Date(),
    }
    const userOrError = User.create(input)
    expect(userOrError.forceSuccess().value.role).toBe(RoleValues.ADMIN)
  })

  const input: UserRestoreProps = {
    createdAt: new Date(),
    id: 'any_id',
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'securepassword123',
    role: RoleValues.ADMIN,
  }
  const user = User.restore(input)
  expect(user.role).toEqual(RoleValues.ADMIN)
})
