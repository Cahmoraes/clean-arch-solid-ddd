import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import type { EtlCollection, EtlRows, EtlSource } from "./etl-types"

type Readers = {
	[K in EtlCollection]: (
		afterId: string | undefined,
		size: number,
	) => Promise<EtlRows[K][]>
}

function after(afterId: string | undefined): { id?: { gt: string } } {
	return afterId === undefined ? {} : { id: { gt: afterId } }
}

export class PrismaEtlSource implements EtlSource {
	private readonly readers: Readers

	constructor(private readonly prisma: PrismaClient) {
		this.readers = {
			plans: (afterId, size) =>
				prisma.plan.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			users: (afterId, size) =>
				prisma.user.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			gyms: (afterId, size) =>
				prisma.gym.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			subscriptions: (afterId, size) =>
				prisma.subscription.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			check_ins: (afterId, size) =>
				prisma.checkIn.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			notifications: (afterId, size) =>
				prisma.notification.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			user_notifications: (afterId, size) =>
				prisma.userNotification.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			user_activity_events: (afterId, size) =>
				prisma.userActivityEvent.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
			stripe_webhook_events: (afterId, size) =>
				prisma.stripeWebhookEvent.findMany({
					where: after(afterId),
					orderBy: { id: "asc" },
					take: size,
				}),
		}
	}

	public readBatch<K extends EtlCollection>(
		collection: K,
		afterId: string | undefined,
		size: number,
	): Promise<EtlRows[K][]> {
		return this.readers[collection](afterId, size)
	}

	public async count(collection: EtlCollection): Promise<number> {
		const counts: Record<EtlCollection, () => Promise<number>> = {
			plans: () => this.prisma.plan.count(),
			users: () => this.prisma.user.count(),
			gyms: () => this.prisma.gym.count(),
			subscriptions: () => this.prisma.subscription.count(),
			check_ins: () => this.prisma.checkIn.count(),
			notifications: () => this.prisma.notification.count(),
			user_notifications: () => this.prisma.userNotification.count(),
			user_activity_events: () => this.prisma.userActivityEvent.count(),
			stripe_webhook_events: () => this.prisma.stripeWebhookEvent.count(),
		}
		return counts[collection]()
	}
}
