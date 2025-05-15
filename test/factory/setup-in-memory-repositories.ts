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
  container.rebindSync(TYPES.Repositories.User).toConstantValue(userRepository)
  const gymRepository = new InMemoryGymRepository()
  container.rebindSync(TYPES.Repositories.Gym).toConstantValue(gymRepository)
  const checkInRepository = new InMemoryCheckInRepository()
  container
    .rebindSync(TYPES.Repositories.CheckIn)
    .toConstantValue(checkInRepository)
  return {
    userRepository,
    gymRepository,
    checkInRepository,
  }
}
