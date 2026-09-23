import { z } from "zod"

export const mySubscriptionResponseSchema = z.object({
	id: z.string().meta({ description: "Subscription ID" }),
	state: z.enum(["active", "cancel_scheduled", "expired"]).meta({
		description:
			"Derived state: expired only when the cancellation was scheduled and the period ended",
		example: "active",
	}),
	plan: z
		.object({
			id: z.string().meta({ description: "Plan ID" }),
			name: z.string().meta({ description: "Plan name" }),
			priceId: z.string().meta({ description: "Stripe Price ID of the plan" }),
		})
		.nullable()
		.meta({ description: "Current plan, null for legacy subscriptions" }),
	currentPeriodStart: z.string().meta({
		description: "Start of the paid period (ISO 8601 UTC)",
		example: "2026-10-15T12:00:00.000Z",
	}),
	currentPeriodEnd: z.string().meta({
		description: "End of the paid period (ISO 8601 UTC)",
		example: "2026-11-15T12:00:00.000Z",
	}),
	cancelAtPeriodEnd: z
		.boolean()
		.meta({ description: "True when the cancellation is scheduled" }),
})

export const nullableMySubscriptionResponseSchema =
	mySubscriptionResponseSchema.nullable()
