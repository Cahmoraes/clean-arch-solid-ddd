import type { Plan } from "../../domain/plan"
import type { Subscription, SubscriptionState } from "../../domain/subscription"

export interface MySubscriptionPlanView {
	id: string
	name: string
	priceId: string
}

export interface MySubscriptionView {
	id: string
	state: SubscriptionState
	plan: MySubscriptionPlanView | null
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
}

export function toMySubscriptionView(
	subscription: Subscription,
	plan: Plan | null,
	now: Date,
): MySubscriptionView {
	return {
		id: subscription.id,
		state: subscription.resolveState(now),
		plan: plan
			? { id: plan.id, name: plan.name, priceId: plan.stripePriceId }
			: null,
		currentPeriodStart: subscription.currentPeriodStart.toISOString(),
		currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
		cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
	}
}
