import { InMemoryCheckInRepository } from '@/shared/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/shared/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemorySubscriptionRepository } from '@/shared/infra/database/repository/in-memory/in-memory-subscription-repository'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'
import { CHECKIN_TYPES, GYM_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'

export interface SetupInMemoryRepositoriesOutput {
  userRepository: InMemoryUserRepository
  gymRepository: InMemoryGymRepository
  checkInRepository: InMemoryCheckInRepository
  subscriptionRepository: InMemorySubscriptionRepository
}

export function setupInMemoryRepositories(): SetupInMemoryRepositoriesOutput {
  const userRepository = new InMemoryUserRepository()
  container
    .rebindSync(USER_TYPES.Repositories.User)
    .toConstantValue(userRepository)
  const gymRepository = new InMemoryGymRepository()
  container
    .rebindSync(GYM_TYPES.Repositories.Gym)
    .toConstantValue(gymRepository)
  const checkInRepository = new InMemoryCheckInRepository()
  container
    .rebindSync(CHECKIN_TYPES.Repositories.CheckIn)
    .toConstantValue(checkInRepository)
  const subscriptionRepository = new InMemorySubscriptionRepository()
  container
    .rebindSync(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
    .toConstantValue(subscriptionRepository)
  return {
    userRepository,
    gymRepository,
    checkInRepository,
    subscriptionRepository,
  }
}
