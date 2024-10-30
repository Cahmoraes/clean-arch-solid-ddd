import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type { UserRepository } from '@/application/repository/user-repository'
import type { User } from '@/domain/user'

@injectable()
export class InMemoryUserRepository implements UserRepository {
  public users = new ExtendedSet<User>()

  public async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email)
  }

  public async create(user: User): Promise<void> {
    this.users.add(user)
  }
}
