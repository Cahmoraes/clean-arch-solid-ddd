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
		ListActivePlans: Symbol.for("ListActivePlansUseCase"),
		CreatePlan: Symbol.for("CreatePlanUseCase"),
		UpdatePlan: Symbol.for("UpdatePlanUseCase"),
		InactivatePlan: Symbol.for("InactivatePlanUseCase"),
		ReactivatePlan: Symbol.for("ReactivatePlanUseCase"),
		ListPlansAdmin: Symbol.for("ListPlansAdminUseCase"),
	},
	CONTROLLERS: {
		CreateCustomer: Symbol.for("CreateCustomerController"),
		CreateSubscription: Symbol.for("CreateSubscriptionController"),
		StripeWebhook: Symbol.for("StripeWebhookController"),
		ListPlans: Symbol.for("ListPlansController"),
		CreatePlan: Symbol.for("CreatePlanController"),
		UpdatePlan: Symbol.for("UpdatePlanController"),
		InactivatePlan: Symbol.for("InactivatePlanController"),
		ReactivatePlan: Symbol.for("ReactivatePlanController"),
		ListPlansAdmin: Symbol.for("ListPlansAdminController"),
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
