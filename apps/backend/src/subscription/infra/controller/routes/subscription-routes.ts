const WEBHOOK_PREFIX = "/webhook"
const SUBSCRIPTION_PREFIX = "/subscriptions"

export const SubscriptionRoutes = {
	STRIPE_WEBHOOK: `${WEBHOOK_PREFIX}/stripe`,
	CREATE: SUBSCRIPTION_PREFIX,
	PLANS: "/plans",
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
