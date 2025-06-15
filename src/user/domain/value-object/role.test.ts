import { Role, RoleValues } from './role'

describe('Role Value Object', () => {
  test('Deve criar uma Role de Membro com valor padrão', () => {
    const role = Role.create()
    expect(role.value).toBe(RoleValues.MEMBER)
  })

  test('Deve criar uma role de Membro sem valor padrão', () => {
    const role = Role.create(RoleValues.MEMBER)
    expect(role.value).toBe(RoleValues.MEMBER)
  })

  test('Deve criar uma role de Administrador', () => {
    const role = Role.create(RoleValues.ADMIN)
    expect(role.value).toBe(RoleValues.ADMIN)
  })

  test('Deve restaurar uma Role', () => {
    const role = Role.create(RoleValues.ADMIN)
    const restoredRole = Role.restore(role.value)
    expect(restoredRole.value).toBe(role.value)
  })
})
