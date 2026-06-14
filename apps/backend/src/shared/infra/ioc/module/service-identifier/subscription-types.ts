export const SUBSCRIPTION_TYPES = {
	GATEWAYS: {
		Stripe: Symbol.for("StripeSubscriptionGateway"),
	},
	USE_CASES: {
		CreateCustomer: Symbol.for("CreateCustomerSubscriptionUseCase"),
		CreateSubscription: Symbol.for("CreateSubscriptionUseCase"),
		ActivateSubscription: Symbol.for("ActivateSubscriptionUseCase"),
		CancelSubscription: Symbol.for("CancelSubscriptionUseCase"),
		HandlePaymentFailed: Symbol.for("HandlePaymentFailedUseCase"),
		ListPlans: Symbol.for("ListPlansUseCase"),
	},
	CONTROLLERS: {
		CreateCustomer: Symbol.for("CreateCustomerController"),
		CreateSubscription: Symbol.for("CreateSubscriptionController"),
		StripeWebhook: Symbol.for("StripeWebhookController"),
		ListPlans: Symbol.for("ListPlansController"),
	},
	REPOSITORIES: {
		Subscription: Symbol.for("SubscriptionRepository"),
		StripeWebhookEvent: Symbol.for("StripeWebhookEventRepository"),
	},
	SERVICES: {
		Lifecycle: Symbol.for("SubscriptionLifecycleService"),
	},
	WORKERS: {
		StripeWebhook: Symbol.for("StripeWebhookWorker"),
	},
} as const
