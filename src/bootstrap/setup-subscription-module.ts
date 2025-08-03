import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'

import { type ModuleControllers, resolve } from './server-build'

export function setupSubscriptionModule(): ModuleControllers {
  const controllers = [
    resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateCustomer),
    resolve(SUBSCRIPTION_TYPES.CONTROLLERS.StripeWebhook),
  ]
  return { controllers }
}
