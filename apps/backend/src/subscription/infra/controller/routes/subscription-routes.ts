const WEBHOOK_PREFIX = "/webhook"
const SUBSCRIPTION_PREFIX = "/subscriptions"
const ADMIN_PLANS_PREFIX = "/admin/plans"

export const SubscriptionRoutes = {
	STRIPE_WEBHOOK: `${WEBHOOK_PREFIX}/stripe`,
	CREATE: SUBSCRIPTION_PREFIX,
	PLANS: "/plans",
	ADMIN_PLANS: ADMIN_PLANS_PREFIX,
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
