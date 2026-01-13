import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"

import type { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

@injectable()
export class InMemorySubscriptionRepository implements SubscriptionRepository {
	public data: ExtendedSet<Subscription> = new ExtendedSet<Subscription>()

	public async save(subscription: Subscription): Promise<void> {
		this.data.add(subscription)
	}

	public async update(subscription: Subscription): Promise<void> {
		this.data.add(subscription)
	}

	public async ofId(id: string): Promise<Subscription | null> {
		return this.data.find((subscriptions) => subscriptions.id === id)
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		return this.data.find((subscriptions) => subscriptions.userId === userId)
	}
}
