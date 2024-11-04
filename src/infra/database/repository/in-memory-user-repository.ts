import { randomUUID } from 'node:crypto'

import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type { UserRepository } from '@/application/repository/user-repository'
import { User } from '@/domain/user'

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
    })
    this.users.add(userWithId)
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email)
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id)
  }
}
