import type { RoleTypes } from '@/domain/value-object/role'

export interface FetchUsersInput {
  page: number
  limit: number
}

export interface FetchUsersOutput {
  id: string
  email: string
  name: string
  role: RoleTypes
  createdAt: string
}

export interface UserDAO {
  fetchUsers(input: FetchUsersInput): Promise<FetchUsersOutput[]>
}
