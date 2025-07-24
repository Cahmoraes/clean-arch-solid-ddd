export const SUBSCRIPTION_TYPES = {
  GATEWAYS: {
    Stripe: Symbol.for('StripeSubscriptionGateway'),
  },
  USE_CASES: {
    CreateCustomer: Symbol.for('CreateCustomerSubscriptionUseCase'),
  },
} as const
