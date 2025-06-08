import { InvalidEmailError } from './error/invalid-email-error'
import { InvalidNameLengthError } from './error/invalid-name-length-error'
import { User, type UserCreate, type UserRestore } from './user'
import { RoleValues } from './value-object/role'

describe('User Entity', () => {
  test('Deve criar um usuário', () => {
    const input: UserCreate = {
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
    expect(userOrError.forceSuccess().value.updatedAt).toBeUndefined()
    expect(userOrError.forceSuccess().value.id).toBeNull()
    expect(userOrError.forceSuccess().value.isActive).toBe(true)
  })

  test('Deve restaurar um usuário', () => {
    const input: UserRestore = {
      createdAt: new Date(),
      id: 'any_id',
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      role: RoleValues.MEMBER,
      status: 'activated',
    }
    const user = User.restore(input)
    expect(user).toBeDefined()
    expect(user.id).toEqual(input.id)
    expect(user.name).toEqual(input.name)
    expect(user.email).toEqual(input.email)
    expect(user.role).toEqual(input.role)
    expect(user.password).toEqual(expect.any(String))
    expect(user.createdAt).toEqual(input.createdAt)
    expect(user.isActive).toBe(true)
  })

  test('Não deve criar um usuário com nome inválido', () => {
    const input: UserCreate = {
      name: '',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceFailure().value).toEqual([
      expect.any(InvalidNameLengthError),
    ])
  })

  test('Não deve criar um usuário com email inválido', () => {
    const input: UserCreate = {
      name: 'John Doe',
      email: '',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceFailure().value).toEqual([
      expect.any(InvalidEmailError),
    ])
  })

  test('Não deve criar um usuário com nome e email inválido', () => {
    const input: UserCreate = {
      name: '',
      email: '',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    expect(userOrError.forceFailure().value).toEqual([
      expect.any(InvalidNameLengthError),
      expect.any(InvalidEmailError),
    ])
  })

  test('Deve criar um usuário com uma data de criação pré-definida', () => {
    const input: UserCreate = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      createdAt: new Date(),
    }
    const userOrError = User.create(input)
    expect(userOrError.forceSuccess().value.createdAt).toBe(input.createdAt)
  })

  test('Deve criar um usuário ADMINISTRADOR', () => {
    const input: UserCreate = {
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
    const input: UserRestore = {
      createdAt: new Date(),
      id: 'any_id',
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      role: RoleValues.ADMIN,
      status: 'activated',
    }
    const user = User.restore(input)
    expect(user.role).toEqual(RoleValues.ADMIN)
  })

  test('Deve alterar a senha de um usuário', () => {
    const input: UserCreate = {
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

  test('Deve atualizar um usuário com dados alterados', () => {
    const input: UserCreate = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const observer = vi.fn()
    const user = User.create(input).forceSuccess().value
    user.subscribe(observer)
    const updateUserResult = user.updateProfile({
      email: 'martin@fowler.com',
      name: 'Martin Fowler',
    })
    expect(updateUserResult.isSuccess()).toBe(true)
    expect(observer).toBeCalledTimes(1)
    expect(user).toBeInstanceOf(User)
    expect(user.id).toBe(user.id)
    expect(user.name).toBe('Martin Fowler')
    expect(user.email).toBe('martin@fowler.com')
    expect(user.password).toBe(user.password)
    expect(user.role).toBe(user.role)
    expect(user.createdAt).toBe(user.createdAt)
    expect(user.updatedAt).toEqual(expect.any(Date))
    expect(user.checkPassword('securepassword123')).toBe(true)
  })

  test('Deve suspender um usuário ativo', () => {
    const input: UserCreate = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const user = User.create(input).forceSuccess().value
    expect(user.isSuspend).toBe(false)
    user.suspend()
    expect(user.isActive).toBe(false)
    expect(user.isSuspend).toBe(true)
  })

  test('Deve ativar um usuário suspenso', () => {
    const input: UserCreate = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      status: 'suspended',
    }
    const user = User.create(input).forceSuccess().value
    expect(user.isSuspend).toBe(true)
    user.activate()
    expect(user.isSuspend).toBe(false)
    expect(user.isActive).toBe(true)
  })

  test('Deve restaurar um usuário suspenso', () => {
    const input: UserRestore = {
      createdAt: new Date(),
      id: 'any_id',
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
      role: RoleValues.MEMBER,
      status: 'suspended',
    }
    const user = User.restore(input)
    expect(user.isActive).toBe(false)
  })
})
