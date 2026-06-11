import type { Notification } from "@/notification/domain/notification.js"

export interface SaveNotificationResponse {
	id: string
}

export interface FindManyNotificationsInput {
	userId: string
	page: number
	onlyUnread?: boolean
}

export interface FindManyNotificationsOutput {
	items: Notification[]
	total: number
}

export interface NotificationRepository {
	save(notification: Notification): Promise<SaveNotificationResponse>
	findById(id: string): Promise<Notification | null>
	findManyByUserId(
		input: FindManyNotificationsInput,
	): Promise<FindManyNotificationsOutput>
	countUnreadByUserId(userId: string): Promise<number>
	markAllAsReadByUserId(userId: string): Promise<void>
}
