import { User } from '@/domain/user'
import type { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'

export interface CreateAndSaveUserProps {
  userRepository: InMemoryUserRepository
  id?: string
  email?: string
}

export async function createAndSaveUser(props: CreateAndSaveUserProps) {
  const userId = props.id ?? 'any_user_id'
  const user = User.create({
    id: userId,
    name: 'any_name',
    email: props.email ?? 'john@doe.com.br',
    password: 'any_password',
  }).force.success().value
  await props.userRepository.save(user)
  return props.userRepository.users.toArray()[0]
}
