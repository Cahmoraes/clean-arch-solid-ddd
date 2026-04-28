const WEBHOOK_PREFIX = "/webhook"

export const SubscriptionRoutes = {
	STRIPE_WEBHOOK: `${WEBHOOK_PREFIX}/stripe`,
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
