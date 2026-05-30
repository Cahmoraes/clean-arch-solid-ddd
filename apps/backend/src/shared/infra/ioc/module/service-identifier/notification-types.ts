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
		Notification: Symbol.for("NotificationController"),
	},
	EventHandlers: {
		CreateNotificationOnCheckIn: Symbol.for(
			"CreateNotificationOnCheckInEventHandler",
		),
	},
} as const
