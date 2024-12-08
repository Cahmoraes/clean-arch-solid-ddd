import { User } from '@/domain/user'
import type { RoleTypes } from '@/domain/value-object/role'
import type { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'

export interface CreateAndSaveUserProps {
  userRepository: InMemoryUserRepository
  id?: string
  email?: string
  password?: string
  role?: RoleTypes
}

export async function createAndSaveUser(props: CreateAndSaveUserProps) {
  const userId = props.id ?? 'any_user_id'
  const user = User.create({
    id: userId,
    name: 'any_name',
    email: props.email ?? 'john@doe.com.br',
    password: props.password ?? 'any_password',
    role: props.role ?? 'MEMBER',
  }).force.success().value
  await props.userRepository.save(user)
  return props.userRepository.users.toArray()[0]
}
