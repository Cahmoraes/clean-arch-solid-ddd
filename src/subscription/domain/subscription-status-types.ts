export const SubscriptionStatusTypes = {
	active: "active",
	canceled: "canceled",
	incomplete: "incomplete",
	incomplete_expired: "incomplete_expired",
	past_due: "past_due",
	trialing: "trialing",
	unpaid: "unpaid",
	paused: "paused",
} as const

export type SubscriptionStatusTypes =
	(typeof SubscriptionStatusTypes)[keyof typeof SubscriptionStatusTypes]
