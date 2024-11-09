import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

export interface SetupInMemoryRepositoriesOutput {
  userRepository: InMemoryUserRepository
  gymRepository: InMemoryGymRepository
  checkInRepository: InMemoryCheckInRepository
}

export function setupInMemoryRepositories(): SetupInMemoryRepositoriesOutput {
  const userRepository = new InMemoryUserRepository()
  container.rebind(TYPES.Repositories.User).toConstantValue(userRepository)
  const gymRepository = new InMemoryGymRepository()
  container.rebind(TYPES.Repositories.Gym).toConstantValue(gymRepository)
  const checkInRepository = new InMemoryCheckInRepository()
  container
    .rebind(TYPES.Repositories.CheckIn)
    .toConstantValue(checkInRepository)
  return {
    userRepository,
    gymRepository,
    checkInRepository,
  }
}
