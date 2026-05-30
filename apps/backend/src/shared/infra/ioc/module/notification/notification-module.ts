import { ContainerModule } from "inversify"
import { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler"
import { GetNotificationsUseCase } from "@/notification/application/use-case/get-notifications.usecase"
import { GetUnreadCountUseCase } from "@/notification/application/use-case/get-unread-count.usecase"
import { MarkAllAsReadUseCase } from "@/notification/application/use-case/mark-all-as-read.usecase"
import { MarkAsReadUseCase } from "@/notification/application/use-case/mark-as-read.usecase"
import { RedisNotificationPublisher } from "@/notification/infra/redis/redis-notification-publisher"
import { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"
import { NotificationRepositoryProvider } from "@/notification/infra/repository/notification-repository-provider"
import { SseManager } from "@/notification/infra/sse/sse-manager"
import { NotificationQueueWorker } from "@/notification/infra/worker/notification-queue-worker"
import { NOTIFICATION_TYPES } from "../../types"

export const notificationModule = new ContainerModule(({ bind }) => {
	bind(NOTIFICATION_TYPES.Repositories.Notification)
		.toDynamicValue(NotificationRepositoryProvider.provide)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.UseCases.GetNotifications).to(GetNotificationsUseCase)
	bind(NOTIFICATION_TYPES.UseCases.GetUnreadCount).to(GetUnreadCountUseCase)
	bind(NOTIFICATION_TYPES.UseCases.MarkAsRead).to(MarkAsReadUseCase)
	bind(NOTIFICATION_TYPES.UseCases.MarkAllAsRead).to(MarkAllAsReadUseCase)
	bind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn)
		.to(CreateNotificationOnCheckInEventHandler)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.SseManager).to(SseManager).inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher)
		.to(RedisNotificationPublisher)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)
		.to(RedisNotificationSubscriber)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)
		.to(NotificationQueueWorker)
		.inSingletonScope()
	// Controllers are intentionally bound in task 12, when the concrete classes are introduced.
})
