export const NotificationRoutes = {
	LIST: "/api/v1/notifications",
	UNREAD_COUNT: "/api/v1/notifications/unread-count",
	MARK_AS_READ: "/api/v1/notifications/:id/read",
	MARK_ALL_AS_READ: "/api/v1/notifications/read-all",
	STREAM: "/api/v1/notifications/stream",
} as const

export type NotificationRoutesType =
	(typeof NotificationRoutes)[keyof typeof NotificationRoutes]
