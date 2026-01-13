import type { Subscription } from "../domain/subscription"

export interface SubscriptionRepository {
	save(subscription: Subscription): Promise<void>
	update(subscription: Subscription): Promise<void>
	ofId(id: string): Promise<Subscription | null>
	ofUserId(userId: string): Promise<Subscription | null>
}
