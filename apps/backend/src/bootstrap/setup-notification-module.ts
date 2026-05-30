import type { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler"
import type { GetNotificationsController } from "@/notification/infra/controller/get-notifications.controller.js"
import type { GetUnreadCountController } from "@/notification/infra/controller/get-unread-count.controller.js"
import type { MarkAllAsReadController } from "@/notification/infra/controller/mark-all-as-read.controller.js"
import type { MarkAsReadController } from "@/notification/infra/controller/mark-as-read.controller.js"
import type { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"
import type { NotificationQueueWorker } from "@/notification/infra/worker/notification-queue-worker"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

export async function setupNotificationModule(): Promise<ModuleControllers> {
	const createNotificationOnCheckInEventHandler =
		resolve<CreateNotificationOnCheckInEventHandler>(
			NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn,
		)
	createNotificationOnCheckInEventHandler.subscribe()
	const redisNotificationSubscriber = resolve<RedisNotificationSubscriber>(
		NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber,
	)
	await redisNotificationSubscriber.subscribe()
	const notificationQueueWorker = resolve<NotificationQueueWorker>(
		NOTIFICATION_TYPES.Infra.NotificationQueueWorker,
	)
	await notificationQueueWorker.init()
	return {
		controllers: [
			resolve<GetNotificationsController>(
				NOTIFICATION_TYPES.Controllers.GetNotifications,
			),
			resolve<GetUnreadCountController>(
				NOTIFICATION_TYPES.Controllers.GetUnreadCount,
			),
			resolve<MarkAsReadController>(NOTIFICATION_TYPES.Controllers.MarkAsRead),
			resolve<MarkAllAsReadController>(
				NOTIFICATION_TYPES.Controllers.MarkAllAsRead,
			),
		],
		workers: [notificationQueueWorker],
	}
}
