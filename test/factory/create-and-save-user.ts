import { User } from '@/user/domain/user'
import type { RoleTypes } from '@/user/domain/value-object/role'
import type { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'

export interface CreateAndSaveUserProps {
  userRepository: InMemoryUserRepository
  id?: string
  name?: string
  email?: string
  password?: string
  role?: RoleTypes
}

// eslint-disable-next-line complexity
export async function createAndSaveUser(props: CreateAndSaveUserProps) {
  const userId = props.id ?? 'any_user_id'
  const name = props.name ?? 'any_name'
  const email = props.email ?? 'john@doe.com.br'
  const user = User.create({
    id: userId,
    name: name,
    email: email,
    password: props.password ?? 'any_password',
    role: props.role ?? 'MEMBER',
  }).force.success().value
  await props.userRepository.save(user)
  return props.userRepository.users.find((user) => user.id === userId)!
}
