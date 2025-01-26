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

  test('Deve restaurar um usuário ADMINISTRADOR', () => {
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

  test('Deve alterar a senha de um usuário', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '123456',
    }
    const user = User.create(input).forceSuccess().value
    const oldPassword = user.password
    const newRawPassword = '654321'
    const result = user.changePassword(newRawPassword)
    expect(result.isSuccess()).toBe(true)
    expect(user.password).not.toBe(oldPassword)
    expect(user.checkPassword(newRawPassword)).toBe(true)
  })

  test('Deve clonar um usuário', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const user = User.create(input).forceSuccess().value
    const clone = user.clone().forceSuccess().value
    expect(clone).toBeInstanceOf(User)
    expect(clone.name).toBe(user.name)
    expect(clone.email).toBe(user.email)
    expect(clone.password).toBe(user.password)
    expect(clone.role).toBe(user.role)
    expect(clone.createdAt).toBe(user.createdAt)
    clone.changePassword('new_password')
    expect(clone.checkPassword('new_password')).toBe(true)
    expect(user.checkPassword('new_password')).toBe(false)
  })

  test('Deve clonar um usuário com dados alterados', () => {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const user = User.create(input).forceSuccess().value
    const clone = user
      .clone({
        email: 'martin@fowler.com',
        name: 'Martin Fowler',
      })
      .forceSuccess().value

    expect(clone).toBeInstanceOf(User)
    expect(clone.id).toBe(user.id)
    expect(clone.name).toBe('Martin Fowler')
    expect(clone.email).toBe('martin@fowler.com')
    expect(clone.password).toBe(user.password)
    expect(clone.role).toBe(user.role)
    expect(clone.createdAt).toBe(user.createdAt)
    expect(clone.checkPassword('securepassword123')).toBe(true)
    expect(user.checkPassword('securepassword123')).toBe(true)
  })
})
