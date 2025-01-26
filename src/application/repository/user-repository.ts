import type { User } from '@/domain/user'

export interface UserRepository {
  userOfEmail(email: string): Promise<User | null>
  userOfId(id: string): Promise<User | null>
  save(user: User): Promise<void>
  update(user: User): Promise<void>
}
