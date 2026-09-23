const WEBHOOK_PREFIX = "/webhook"
const SUBSCRIPTION_PREFIX = "/subscriptions"
const ADMIN_PLANS_PREFIX = "/admin/plans"

export const SubscriptionRoutes = {
	STRIPE_WEBHOOK: `${WEBHOOK_PREFIX}/stripe`,
	CREATE: SUBSCRIPTION_PREFIX,
	PLANS: "/plans",
	ADMIN_PLANS: ADMIN_PLANS_PREFIX,
	ADMIN_PLAN_BY_ID: `${ADMIN_PLANS_PREFIX}/:id`,
	ADMIN_PLAN_INACTIVATE: `${ADMIN_PLANS_PREFIX}/:id/inactivate`,
	ADMIN_PLAN_REACTIVATE: `${ADMIN_PLANS_PREFIX}/:id/reactivate`,
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
