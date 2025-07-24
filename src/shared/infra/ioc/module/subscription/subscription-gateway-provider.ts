import type { ResolutionContext } from 'inversify'

import { TestingSubscriptionGateway } from '@/shared/infra/gateway/testing-subscription-gateway'
import type { SubscriptionGateway } from '@/subscription/gateway/subscription-gateway'

export class SubscriptionGatewayProvider {
  public static provide(context: ResolutionContext): SubscriptionGateway {
    return context.get(TestingSubscriptionGateway, { autobind: true })
  }
}
