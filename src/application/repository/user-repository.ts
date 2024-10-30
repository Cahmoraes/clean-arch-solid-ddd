import type { User } from '@/domain/user'

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>
  create(user: User): Promise<void>
}
