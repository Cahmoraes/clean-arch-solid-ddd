import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import { SubscriptionNotPersistedError } from "@/shared/infra/errors/subscription-not-persisted-error"
import type { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

@injectable()
export class InMemorySubscriptionRepository implements SubscriptionRepository {
	public data: ExtendedSet<Subscription> = new ExtendedSet<Subscription>()

	public withTransaction<TX extends object>(_tx: TX): SubscriptionRepository {
		return this
	}

	public async save(subscription: Subscription): Promise<void> {
		this.data.add(subscription)
	}

	public async update(subscription: Subscription): Promise<void> {
		const existing = this.data.find((current) => current.id === subscription.id)
		if (!existing) throw new SubscriptionNotPersistedError(subscription.id)
		this.data.delete(existing)
		this.data.add(subscription)
	}

	public async ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null> {
		return this.data.find(
			(subscription) =>
				subscription.billingSubscriptionId === billingSubscriptionId,
		)
	}

	public async ofCustomerId(customerId: string): Promise<Subscription | null> {
		return this.data.find(
			(subscription) => subscription.customerId === customerId,
		)
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		return (
			this.data.find(
				(subscription) =>
					subscription.userId === userId && subscription.status === "active",
			) ?? null
		)
	}
}
