export const NOTIFICATION_TYPES = {
	Repositories: {
		Notification: Symbol.for("NotificationRepository"),
	},
	UseCases: {
		GetNotifications: Symbol.for("GetNotificationsUseCase"),
		GetUnreadCount: Symbol.for("GetUnreadCountUseCase"),
		MarkAsRead: Symbol.for("MarkAsReadUseCase"),
		MarkAllAsRead: Symbol.for("MarkAllAsReadUseCase"),
	},
	Controllers: {
		GetNotifications: Symbol.for("GetNotificationsController"),
		GetUnreadCount: Symbol.for("GetUnreadCountController"),
		MarkAsRead: Symbol.for("MarkAsReadController"),
		MarkAllAsRead: Symbol.for("MarkAllAsReadController"),
		NotificationStream: Symbol.for("NotificationStreamController"),
	},
	EventHandlers: {
		CreateNotificationOnCheckIn: Symbol.for(
			"CreateNotificationOnCheckInEventHandler",
		),
	},
	Infra: {
		SseManager: Symbol.for("SseManager"),
		RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
		RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
		NotificationQueueWorker: Symbol.for("NotificationQueueWorker"),
	},
} as const
