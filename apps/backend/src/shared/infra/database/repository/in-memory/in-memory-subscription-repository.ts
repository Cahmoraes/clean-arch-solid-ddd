import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
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
}
