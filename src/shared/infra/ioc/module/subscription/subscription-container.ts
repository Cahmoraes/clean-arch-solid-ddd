import { ContainerModule } from 'inversify'

import { CreateCustomerController } from '@/subscription/infra/controller/create-customer-controller'
import { StripeWebhookController } from '@/subscription/infra/controller/stripe-webhook.controller'
import { CreateCustomer } from '@/subscription/use-case/create-customer.usecase'
import { CreateSubscriptionUseCase } from '@/subscription/use-case/create-subscription.usecase'

import { SUBSCRIPTION_TYPES } from '../service-identifier/subscription-types'
import { SubscriptionGatewayProvider } from './subscription-gateway-provider'
import { SubscriptionRepositoryProvider } from './subscription-repository-provider'

export const subscriptionContainer = new ContainerModule(({ bind }): void => {
  bind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
    .toDynamicValue(SubscriptionGatewayProvider.provide)
    .inSingletonScope()
  bind(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
    .toDynamicValue(SubscriptionRepositoryProvider.provide)
    .inSingletonScope()
  bind(SUBSCRIPTION_TYPES.CONTROLLERS.CreateCustomer).to(
    CreateCustomerController,
  )
  bind(SUBSCRIPTION_TYPES.USE_CASES.CreateCustomer).to(CreateCustomer)
  bind(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription).to(
    CreateSubscriptionUseCase,
  )
  bind(SUBSCRIPTION_TYPES.CONTROLLERS.StripeWebhook).to(StripeWebhookController)
})
