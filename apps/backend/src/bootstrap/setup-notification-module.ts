import type { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler"
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
	return { controllers: [], workers: [] }
}
