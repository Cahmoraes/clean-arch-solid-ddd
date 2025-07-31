export const SUBSCRIPTION_TYPES = {
  GATEWAYS: {
    Stripe: Symbol.for('StripeSubscriptionGateway'),
  },
  USE_CASES: {
    CreateCustomer: Symbol.for('CreateCustomerSubscriptionUseCase'),
  },
  CONTROLLERS: {
    CreateSubscription: Symbol.for('CreateSubscriptionController'),
  },
} as const
