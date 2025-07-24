import { ContainerModule } from 'inversify'

import { CreateCustomer } from '@/subscription/use-case/create-customer.usecase'

import { SUBSCRIPTION_TYPES } from '../service-identifier/subscription-types'
import { SubscriptionGatewayProvider } from './subscription-gateway-provider'

export const subscriptionContainer = new ContainerModule(({ bind }): void => {
  bind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
    .toDynamicValue(SubscriptionGatewayProvider.provide)
    .inSingletonScope()
  bind(SUBSCRIPTION_TYPES.USE_CASES.CreateCustomer).to(CreateCustomer)
})
