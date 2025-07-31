export const SUBSCRIPTION_TYPES = {
  GATEWAYS: {
    Stripe: Symbol.for('StripeSubscriptionGateway'),
  },
  USE_CASES: {
    CreateCustomer: Symbol.for('CreateCustomerSubscriptionUseCase'),
    CreateSubscription: Symbol.for('CreateSubscriptionUseCase'),
  },
  CONTROLLERS: {
    CreateSubscription: Symbol.for('CreateSubscriptionController'),
  },
  REPOSITORIES: {
    Subscription: Symbol.for('SubscriptionRepository'),
  },
} as const
