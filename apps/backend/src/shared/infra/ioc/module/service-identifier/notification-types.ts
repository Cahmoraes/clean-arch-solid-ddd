export const NOTIFICATION_TYPES = {
	Repositories: {
		Notification: Symbol.for("NotificationRepository"),
	},
	Providers: {
		ActiveRecipients: Symbol.for("ActiveRecipientsProvider"),
	},
	UseCases: {
		GetNotifications: Symbol.for("GetNotificationsUseCase"),
		GetUnreadCount: Symbol.for("GetUnreadCountUseCase"),
		MarkAsRead: Symbol.for("MarkAsReadUseCase"),
		MarkAllAsRead: Symbol.for("MarkAllAsReadUseCase"),
		DeleteNotification: Symbol.for("DeleteNotificationUseCase"),
		BroadcastNotice: Symbol.for("BroadcastNoticeUseCase"),
	},
	Controllers: {
		GetNotifications: Symbol.for("GetNotificationsController"),
		GetUnreadCount: Symbol.for("GetUnreadCountController"),
		MarkAsRead: Symbol.for("MarkAsReadController"),
		MarkAllAsRead: Symbol.for("MarkAllAsReadController"),
		DeleteNotification: Symbol.for("DeleteNotificationController"),
		NotificationStream: Symbol.for("NotificationStreamController"),
		BroadcastNotice: Symbol.for("BroadcastNoticeController"),
	},
	EventHandlers: {
		CreateNotificationOnCheckIn: Symbol.for(
			"CreateNotificationOnCheckInEventHandler",
		),
	},
	Infra: {
		SseManager: Symbol.for("SseManager"),
		NotificationQueueWorker: Symbol.for("NotificationQueueWorker"),
		NotificationBroadcastPublisher: Symbol.for(
			"NotificationBroadcastPublisher",
		),
		NotificationBroadcastSubscriber: Symbol.for(
			"NotificationBroadcastSubscriber",
		),
		AmqpConnect: Symbol.for("AmqpConnect"),
	},
} as const
