import type { ResolutionContext } from 'inversify'

import { InMemorySubscriptionRepository } from '@/shared/infra/database/repository/in-memory/in-memory-subscription-repository'
import type { SubscriptionRepository } from '@/subscription/repository/subscription-repository'

export class SubscriptionRepositoryProvider {
  public static provide(context: ResolutionContext): SubscriptionRepository {
    return context.get(InMemorySubscriptionRepository, { autobind: true })
  }
}
