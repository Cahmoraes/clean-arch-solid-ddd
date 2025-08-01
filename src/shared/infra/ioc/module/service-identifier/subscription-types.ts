export const SUBSCRIPTION_TYPES = {
  GATEWAYS: {
    Stripe: Symbol.for('StripeSubscriptionGateway'),
  },
  USE_CASES: {
    CreateCustomer: Symbol.for('CreateCustomerSubscriptionUseCase'),
    CreateSubscription: Symbol.for('CreateSubscriptionUseCase'),
    ActivateSubscription: Symbol.for('ActivateSubscriptionUseCase'),
    CancelSubscription: Symbol.for('CancelSubscriptionUseCase'),
  },
  CONTROLLERS: {
    CreateSubscription: Symbol.for('CreateSubscriptionController'),
    StripeWebhook: Symbol.for('StripeWebhookController'),
  },
  REPOSITORIES: {
    Subscription: Symbol.for('SubscriptionRepository'),
  },
} as const
