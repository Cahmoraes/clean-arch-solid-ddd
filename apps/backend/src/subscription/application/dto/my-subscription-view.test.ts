import { describe, expect, it } from "vitest"
import { Plan } from "../../domain/plan"
import { Subscription } from "../../domain/subscription"
import { toMySubscriptionView } from "./my-subscription-view"

const plan = Plan.restore({
	id: "plan-1",
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Tagline",
	features: [],
	isActive: true,
	stripePriceId: "price_monthly",
})

function makeSubscription(
	overrides: Partial<Parameters<typeof Subscription.restore>[0]> = {},
) {
	return Subscription.restore({
		id: "sub-1",
		userId: "user-1",
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("toMySubscriptionView", () => {
	const now = new Date("2026-01-15T00:00:00.000Z")

	it("projeta assinatura ativa com plano embutido e datas em ISO UTC", () => {
		expect(toMySubscriptionView(makeSubscription(), plan, now)).toEqual({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
			currentPeriodStart: "2026-01-01T00:00:00.000Z",
			currentPeriodEnd: "2026-02-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
		})
	})

	it("marca cancel_scheduled quando o cancelamento está agendado e o período não venceu", () => {
		const view = toMySubscriptionView(
			makeSubscription({ cancelAtPeriodEnd: true }),
			plan,
			now,
		)

		expect(view.state).toBe("cancel_scheduled")
		expect(view.cancelAtPeriodEnd).toBe(true)
	})

	it("marca expired quando o cancelamento agendado já venceu", () => {
		const view = toMySubscriptionView(
			makeSubscription({ cancelAtPeriodEnd: true }),
			plan,
			new Date("2026-02-01T00:00:00.000Z"),
		)

		expect(view.state).toBe("expired")
	})

	it("devolve plan null para linha legada sem plano", () => {
		const view = toMySubscriptionView(
			makeSubscription({ planId: undefined }),
			null,
			now,
		)

		expect(view.plan).toBeNull()
	})

	it("mantém o plano mesmo quando ele foi inativado no catálogo", () => {
		const view = toMySubscriptionView(
			makeSubscription(),
			plan.inactivate(),
			now,
		)

		expect(view.plan).toEqual({
			id: "plan-1",
			name: "Premium Mensal",
			priceId: "price_monthly",
		})
	})
})
