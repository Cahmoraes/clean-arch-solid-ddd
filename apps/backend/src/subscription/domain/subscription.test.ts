import { describe, expect, it } from "vitest"
import { Subscription } from "./subscription"

describe("Subscription", () => {
	describe("create()", () => {
		it("deve criar uma Subscription com customerId correto", () => {
			const subscription = Subscription.create({
				id: "sub_123",
				userId: "user_123",
				billingSubscriptionId: "sub_stripe_123",
				status: "active",
				customerId: "cus_xxx",
			})

			expect(subscription.customerId).toBe("cus_xxx")
		})

		it("não deve popular updatedAt nem canceledAt na criação", () => {
			const subscription = Subscription.create({
				id: "sub_123",
				userId: "user_123",
				billingSubscriptionId: "sub_stripe_123",
				status: "active",
				customerId: "cus_xxx",
			})

			expect(subscription.updatedAt).toBeUndefined()
			expect(subscription.canceledAt).toBeUndefined()
		})
	})

	describe("restore()", () => {
		it("deve restaurar uma Subscription com customerId correto", () => {
			const createdAt = new Date("2025-01-01")
			const subscription = Subscription.restore({
				id: "sub_123",
				userId: "user_123",
				billingSubscriptionId: "sub_stripe_123",
				status: "active",
				customerId: "cus_xxx",
				createdAt,
			})

			expect(subscription.customerId).toBe("cus_xxx")
		})

		it("deve restaurar todos os campos primitivos fielmente", () => {
			const createdAt = new Date("2025-01-01")
			const updatedAt = new Date("2025-03-01")
			const canceledAt = new Date("2025-06-01")

			const subscription = Subscription.restore({
				id: "sub_123",
				userId: "user_123",
				billingSubscriptionId: "sub_stripe_123",
				status: "canceled",
				customerId: "cus_abc",
				createdAt,
				updatedAt,
				canceledAt,
			})

			expect(subscription.id).toBe("sub_123")
			expect(subscription.userId).toBe("user_123")
			expect(subscription.billingSubscriptionId).toBe("sub_stripe_123")
			expect(subscription.status).toBe("canceled")
			expect(subscription.customerId).toBe("cus_abc")
			expect(subscription.createdAt).toBe(createdAt)
			expect(subscription.updatedAt).toBe(updatedAt)
			expect(subscription.canceledAt).toBe(canceledAt)
		})

		it("deve restaurar com updatedAt e canceledAt opcionais como undefined", () => {
			const subscription = Subscription.restore({
				id: "sub_123",
				userId: "user_123",
				billingSubscriptionId: "sub_stripe_123",
				status: "active",
				customerId: "cus_xxx",
				createdAt: new Date(),
			})

			expect(subscription.updatedAt).toBeUndefined()
			expect(subscription.canceledAt).toBeUndefined()
		})
	})
})
