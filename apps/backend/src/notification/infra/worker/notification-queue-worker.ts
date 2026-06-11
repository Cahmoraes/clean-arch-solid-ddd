import { inject, injectable } from "inversify"

import type { NotificationCreatedPayload } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler.js"
import type { Controller } from "@/shared/infra/controller/controller.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import { QUEUES } from "@/shared/infra/queue/queues.js"
import type { RedisNotificationPublisher } from "../redis/redis-notification-publisher.js"

const NOTIFICATION_CHANNEL_PREFIX = "notifications:"

@injectable()
export class NotificationQueueWorker implements Controller {
	constructor(
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
		@inject(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher)
		private readonly redisNotificationPublisher: RedisNotificationPublisher,
	) {}

	public async init(): Promise<void> {
		await this.queue.consume(
			QUEUES.NOTIFICATION_CREATED,
			async (payload: NotificationCreatedPayload): Promise<void> => {
				await this.redisNotificationPublisher.publish(
					`${NOTIFICATION_CHANNEL_PREFIX}${payload.userId}`,
					JSON.stringify(payload),
				)
			},
		)
	}
}
