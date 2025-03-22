import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

export interface SetupInMemoryRepositoriesOutput {
  userRepository: InMemoryUserRepository
  gymRepository: InMemoryGymRepository
  checkInRepository: InMemoryCheckInRepository
}

export async function setupInMemoryRepositories(): Promise<SetupInMemoryRepositoriesOutput> {
  const userRepository = new InMemoryUserRepository()
  await container.unbind(TYPES.Repositories.User)
  container.bind(TYPES.Repositories.User).toConstantValue(userRepository)
  const gymRepository = new InMemoryGymRepository()
  await container.unbind(TYPES.Repositories.Gym)
  container.bind(TYPES.Repositories.Gym).toConstantValue(gymRepository)
  const checkInRepository = new InMemoryCheckInRepository()
  await container.unbind(TYPES.Repositories.CheckIn)
  container.bind(TYPES.Repositories.CheckIn).toConstantValue(checkInRepository)
  return {
    userRepository,
    gymRepository,
    checkInRepository,
  }
}
