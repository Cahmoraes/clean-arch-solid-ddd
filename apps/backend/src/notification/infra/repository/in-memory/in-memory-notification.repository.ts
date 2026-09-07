import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"

import type {
	FindManyNotificationsInput,
	FindManyNotificationsOutput,
	NotificationRepository,
	SaveNotificationResponse,
} from "@/notification/application/repository/notification.repository.js"
import type { Notification } from "@/notification/domain/notification.js"
import { env } from "@/shared/infra/env/index.js"

@injectable()
export class InMemoryNotificationRepository implements NotificationRepository {
	public notifications = new ExtendedSet<Notification>()

	public async save(
		notification: Notification,
	): Promise<SaveNotificationResponse> {
		const existing = this.notifications.find((n) => n.id === notification.id)
		if (existing) {
			this.notifications.delete(existing)
		}
		this.notifications.add(notification)
		return { id: notification.id }
	}

	public async findById(id: string): Promise<Notification | null> {
		return this.notifications.find((n) => n.id === id) ?? null
	}

	public async findManyByUserId(
		input: FindManyNotificationsInput,
	): Promise<FindManyNotificationsOutput> {
		let filtered = this.notifications
			.toArray()
			.filter((n) => n.userId === input.userId && !n.isDeleted)

		if (input.onlyUnread) {
			filtered = filtered.filter((n) => !n.isRead)
		}

		const total = filtered.length
		const { skip, take } = this.resolvePagination(input)
		const items = filtered.slice(skip, skip + take)
		return { items, total }
	}

	private resolvePagination(input: FindManyNotificationsInput): {
		skip: number
		take: number
	} {
		if (input.offset !== undefined && input.limit !== undefined) {
			return { skip: input.offset, take: input.limit }
		}
		return {
			skip: (input.page - 1) * env.ITEMS_PER_PAGE,
			take: env.ITEMS_PER_PAGE,
		}
	}

	public async countUnreadByUserId(userId: string): Promise<number> {
		return this.notifications
			.toArray()
			.filter((n) => n.userId === userId && !n.isRead && !n.isDeleted).length
	}

	public async markAllAsReadByUserId(userId: string): Promise<void> {
		const unread = this.notifications
			.toArray()
			.filter((n) => n.userId === userId && !n.isRead && !n.isDeleted)
		for (const notification of unread) {
			notification.markAsRead()
		}
	}
}
