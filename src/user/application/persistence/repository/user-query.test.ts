import { User, type UserRestore } from '@/user/domain/user'
import { RoleValues } from '@/user/domain/value-object/role'
import { StatusTypes } from '@/user/domain/value-object/status'

import { UserQuery } from './user-query'

describe('UserQuery', () => {
  const userProps: UserRestore = {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'hashed_password',
    role: RoleValues.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: StatusTypes.ACTIVATED,
  }

  test('Deve criar um UserQuery', () => {
    const user = User.restore(userProps)
    const userObjectQuery = UserQuery.from(user).addField('name').addField('id')
    expect(userObjectQuery.userDTO).toBe(user)
    expect(userObjectQuery.fields['name']).toBe(userProps.name)
    expect(userObjectQuery.fields['id']).toBe(userProps.id)
    expect((userObjectQuery as any).fields['email']).toBeUndefined()
  })
})
