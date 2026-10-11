import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"
import type { MissingRecordErrorClass } from "./missing-record-error"

export interface SubscriptionRepositoryContractContext {
	repository: SubscriptionRepository
	newId(): string
	missingRecordError: MissingRecordErrorClass
	ensureReferences(references: { userIds: string[] }): Promise<void>
	cleanup(): Promise<void>
}

export type SubscriptionProps = Parameters<typeof Subscription.restore>[0]

export function buildSubscriptionProps(
	id: string,
	userId: string,
	overrides: Partial<SubscriptionProps> = {},
): SubscriptionProps {
	return {
		id,
		userId,
		billingSubscriptionId: `sub_${id}`,
		customerId: `cus_${userId}`,
		status: "active",
		currentPeriodStart: new Date("2026-05-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		createdAt: new Date("2026-05-01T00:00:00.000Z"),
		updatedAt: new Date("2026-05-01T00:00:00.000Z"),
		...overrides,
	}
}

export function describeSubscriptionRepositoryContract(
	name: string,
	factory: () => Promise<SubscriptionRepositoryContractContext>,
): void {
	describe(`SubscriptionRepository contract (${name})`, () => {
		let context: SubscriptionRepositoryContractContext
		let userId: string

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			await context.ensureReferences({ userIds: [userId] })
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildSubscription(
			overrides: Partial<SubscriptionProps> = {},
		): Subscription {
			const id = overrides.id ?? context.newId()
			return Subscription.restore(buildSubscriptionProps(id, userId, overrides))
		}

		it("saves a subscription and finds it by billing id, customer id and user id", async () => {
			const subscription = buildSubscription()
			await context.repository.save(subscription)

			const byBilling = await context.repository.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)
			const byCustomer = await context.repository.ofCustomerId(
				subscription.customerId,
			)
			const byUser = await context.repository.ofUserId(userId)

			expect(byBilling?.id).toBe(subscription.id)
			expect(byBilling?.status).toBe("active")
			expect(byBilling?.currentPeriodEnd.toISOString()).toBe(
				"2026-06-01T00:00:00.000Z",
			)
			expect(byBilling?.cancelAtPeriodEnd).toBe(false)
			expect(byCustomer?.id).toBe(subscription.id)
			expect(byUser?.id).toBe(subscription.id)
		})

		it("returns null when nothing matches", async () => {
			expect(
				await context.repository.ofBillingSubscriptionId(context.newId()),
			).toBeNull()
			expect(await context.repository.ofCustomerId(context.newId())).toBeNull()
			expect(await context.repository.ofUserId(userId)).toBeNull()
		})

		it("ofUserId returns only the active subscription of the user", async () => {
			const canceled = buildSubscription({
				status: "canceled",
				canceledAt: new Date("2026-05-20T00:00:00.000Z"),
			})
			await context.repository.save(canceled)

			expect(await context.repository.ofUserId(userId)).toBeNull()
			expect(
				(await context.repository.ofCustomerId(canceled.customerId))?.id,
			).toBe(canceled.id)
		})

		it("update persists status, cancel flag and canceled date", async () => {
			const id = context.newId()
			const original = buildSubscription({ id })
			await context.repository.save(original)

			await context.repository.update(
				buildSubscription({
					id,
					billingSubscriptionId: original.billingSubscriptionId,
					status: "canceled",
					cancelAtPeriodEnd: true,
					canceledAt: new Date("2026-05-20T00:00:00.000Z"),
				}),
			)

			const found = await context.repository.ofBillingSubscriptionId(
				original.billingSubscriptionId,
			)
			expect(found?.status).toBe("canceled")
			expect(found?.cancelAtPeriodEnd).toBe(true)
			expect(found?.canceledAt?.toISOString()).toBe("2026-05-20T00:00:00.000Z")
			expect(await context.repository.ofUserId(userId)).toBeNull()
		})

		it("update of a subscription that does not exist rejects", async () => {
			await expect(
				context.repository.update(buildSubscription()),
			).rejects.toBeInstanceOf(context.missingRecordError)
		})
	})
}
