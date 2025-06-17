import { randomUUID } from 'node:crypto'

import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type { UserQuery } from '@/user/application/repository/user-query'
import type { UserRepository } from '@/user/application/repository/user-repository'
import { User } from '@/user/domain/user'

@injectable()
export class InMemoryUserRepository implements UserRepository {
  public users = new ExtendedSet<User>()

  public async save(user: User): Promise<void> {
    const id = user.id ?? randomUUID()
    const userWithId = User.restore({
      id,
      email: user.email,
      name: user.name,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
      status: user.status,
    })
    this.users.add(userWithId)
  }

  public async update(user: User): Promise<void> {
    const userOrNull = this.users.find((u) => u.id === user.id)
    if (!userOrNull) return
    this.users.delete(userOrNull)
    this.users.add(user)
  }

  public async get(objectQuery: UserQuery): Promise<User | null> {
    const users = this.users.find((user) => {
      const fields = objectQuery.fields
      return Object.keys(fields).every((field) => {
        return (user as any)[field] === (fields as any)[field]
      })
    })
    return users
  }

  public async userOfEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email)
  }

  public async userOfId(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id)
  }
}
