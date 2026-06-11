import type { Subscription } from "../domain/subscription"

export interface SubscriptionRepository {
	save(subscription: Subscription): Promise<void>
	update(subscription: Subscription): Promise<void>
	ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null>
	ofCustomerId(customerId: string): Promise<Subscription | null>
	withTransaction<TX extends object>(tx: TX): SubscriptionRepository
}
