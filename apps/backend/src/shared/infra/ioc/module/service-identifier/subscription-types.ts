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
		CreatePlan: Symbol.for("CreatePlanUseCase"),
	},
	CONTROLLERS: {
		CreateCustomer: Symbol.for("CreateCustomerController"),
		CreateSubscription: Symbol.for("CreateSubscriptionController"),
		StripeWebhook: Symbol.for("StripeWebhookController"),
		ListPlans: Symbol.for("ListPlansController"),
		CreatePlan: Symbol.for("CreatePlanController"),
	},
	REPOSITORIES: {
		Subscription: Symbol.for("SubscriptionRepository"),
		StripeWebhookEvent: Symbol.for("StripeWebhookEventRepository"),
		Plan: Symbol.for("PlanRepository"),
	},
	SERVICES: {
		Lifecycle: Symbol.for("SubscriptionLifecycleService"),
	},
	WORKERS: {
		StripeWebhook: Symbol.for("StripeWebhookWorker"),
	},
} as const
