export const EXCHANGES = {
	LOG: "log",
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	STRIPE_WEBHOOK: "stripeWebhook",
	RATE_LIMIT_EXCEEDED: "rateLimitExceeded",
	NOTIFICATION_CREATED: "notificationCreated",
} as const

export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
