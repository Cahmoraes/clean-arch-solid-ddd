import { describe, expect, it } from "vitest"
import { ActiveSubscriptionAlreadyExistsError } from "./error/active-subscription-already-exists-error.js"
import { NoActiveSubscriptionError } from "./error/no-active-subscription-error.js"
import { SubscriptionCancellationScheduledError } from "./error/subscription-cancellation-scheduled-error.js"
import { Subscription, type SubscriptionRestore } from "./subscription"

function makeSubscription(
	overrides: Partial<SubscriptionRestore> = {},
): Subscription {
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

describe("Subscription: plano e período", () => {
	it("create grava planId e calcula o fim do período pelo billingPeriod", () => {
		const subscription = Subscription.create({
			userId: "user-1",
			billingSubscriptionId: "sub_stripe_1",
			customerId: "cus_1",
			status: "active",
			planId: "plan-anual",
			billingPeriod: "yearly",
			currentPeriodStart: new Date("2026-03-10T00:00:00.000Z"),
		})

		expect(subscription.planId).toBe("plan-anual")
		expect(subscription.currentPeriodStart.toISOString()).toBe(
			"2026-03-10T00:00:00.000Z",
		)
		expect(subscription.currentPeriodEnd.toISOString()).toBe(
			"2027-03-10T00:00:00.000Z",
		)
		expect(subscription.cancelAtPeriodEnd).toBe(false)
	})

	it("restore de linha legada sem plano nem período usa createdAt e +1 mês", () => {
		const subscription = Subscription.restore({
			id: "sub-legacy",
			userId: "user-1",
			billingSubscriptionId: "sub_stripe_legacy",
			customerId: "cus_1",
			status: "active",
			createdAt: new Date("2026-01-31T00:00:00.000Z"),
		})

		expect(subscription.planId).toBeUndefined()
		expect(subscription.currentPeriodStart.toISOString()).toBe(
			"2026-01-31T00:00:00.000Z",
		)
		expect(subscription.currentPeriodEnd.toISOString()).toBe(
			"2026-02-28T00:00:00.000Z",
		)
		expect(subscription.cancelAtPeriodEnd).toBe(false)
	})
})

describe("Subscription.changePlan", () => {
	it("troca o planId mantendo a mesma assinatura e atualiza updatedAt", () => {
		const subscription = makeSubscription()
		const now = new Date("2026-01-10T00:00:00.000Z")

		subscription.changePlan("plan-2", now)

		expect(subscription.planId).toBe("plan-2")
		expect(subscription.id).toBe("sub-1")
		expect(subscription.updatedAt).toEqual(now)
	})

	it("aceita assinatura legada sem planId e grava o novo plano", () => {
		const subscription = makeSubscription({ planId: undefined })

		subscription.changePlan("plan-2")

		expect(subscription.planId).toBe("plan-2")
	})

	it("recusa a troca quando há cancelamento agendado", () => {
		const subscription = makeSubscription({ cancelAtPeriodEnd: true })

		expect(() => subscription.changePlan("plan-2")).toThrow(
			SubscriptionCancellationScheduledError,
		)
		expect(subscription.planId).toBe("plan-1")
	})

	it("assertCanChangePlan lança quando há cancelamento agendado e não lança sem ele", () => {
		expect(() => makeSubscription().assertCanChangePlan()).not.toThrow()
		expect(() =>
			makeSubscription({ cancelAtPeriodEnd: true }).assertCanChangePlan(),
		).toThrow(SubscriptionCancellationScheduledError)
	})
})

describe("Subscription.scheduleCancellation", () => {
	it("marca cancelAtPeriodEnd e mantém o status ativo", () => {
		const subscription = makeSubscription()
		const now = new Date("2026-01-10T00:00:00.000Z")

		subscription.scheduleCancellation(now)

		expect(subscription.cancelAtPeriodEnd).toBe(true)
		expect(subscription.status).toBe("active")
		expect(subscription.updatedAt).toEqual(now)
	})

	it("é idempotente: agendar de novo mantém o estado e não altera updatedAt", () => {
		const subscription = makeSubscription()
		const first = new Date("2026-01-10T00:00:00.000Z")
		subscription.scheduleCancellation(first)

		subscription.scheduleCancellation(new Date("2026-01-20T00:00:00.000Z"))

		expect(subscription.cancelAtPeriodEnd).toBe(true)
		expect(subscription.updatedAt).toEqual(first)
	})
})

describe("Subscription.isExpired e resolveState", () => {
	it("sem cancelamento agendado nunca está vencida, mesmo após o fim do período", () => {
		const subscription = makeSubscription()

		expect(subscription.isExpired(new Date("2027-01-01T00:00:00.000Z"))).toBe(
			false,
		)
		expect(
			subscription.resolveState(new Date("2027-01-01T00:00:00.000Z")),
		).toBe("active")
	})

	it("resolveState devolve cancel_scheduled antes do fim e expired depois", () => {
		const subscription = makeSubscription({ cancelAtPeriodEnd: true })

		expect(
			subscription.resolveState(new Date("2026-01-15T00:00:00.000Z")),
		).toBe("cancel_scheduled")
		expect(
			subscription.resolveState(new Date("2026-02-15T00:00:00.000Z")),
		).toBe("expired")
	})
})

describe("Subscription.closeExpired", () => {
	it("encerra a linha com status canceled e canceledAt igual ao fim do período", () => {
		const subscription = makeSubscription({ cancelAtPeriodEnd: true })
		const now = new Date("2026-03-01T00:00:00.000Z")

		subscription.closeExpired(now)

		expect(subscription.status).toBe("canceled")
		expect(subscription.canceledAt).toEqual(subscription.currentPeriodEnd)
		expect(subscription.updatedAt).toEqual(now)
	})
})

describe("erros de domínio da assinatura", () => {
	it("expõe kind e mensagem de cada erro", () => {
		expect(new ActiveSubscriptionAlreadyExistsError().kind).toBe("conflict")
		expect(new SubscriptionCancellationScheduledError().kind).toBe("conflict")
		const noActive = new NoActiveSubscriptionError()
		expect(noActive.kind).toBe("not-found")
		expect(noActive.message).toBe("Você não possui assinatura ativa")
	})
})

describe("Subscription.isExpired na fronteira de currentPeriodEnd", () => {
	it("está vencida exatamente em currentPeriodEnd e não está um milissegundo antes", () => {
		const end = new Date("2026-02-01T00:00:00.000Z")
		const subscription = makeSubscription({
			cancelAtPeriodEnd: true,
			currentPeriodEnd: end,
		})

		expect(subscription.isExpired(new Date(end.getTime() - 1))).toBe(false)
		expect(subscription.isExpired(new Date(end.getTime()))).toBe(true)
		expect(subscription.isExpired(new Date(end.getTime() + 1))).toBe(true)
		expect(subscription.resolveState(new Date(end.getTime()))).toBe("expired")
		expect(subscription.resolveState(new Date(end.getTime() - 1))).toBe(
			"cancel_scheduled",
		)
	})
})
