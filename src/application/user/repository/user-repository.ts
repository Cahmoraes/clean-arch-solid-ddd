import type { User } from '@/domain/user/user'

import type { UserQuery } from './user-query'

export interface UserRepository {
  userOfEmail(email: string): Promise<User | null>
  userOfId(id: string): Promise<User | null>
  save(user: User): Promise<void>
  update(user: User): Promise<void>
  get(userQuery: UserQuery): Promise<User | null>
}
