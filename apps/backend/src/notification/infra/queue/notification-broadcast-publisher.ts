import { inject, injectable } from "inversify"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { Queue } from "@/shared/infra/queue/queue"

@injectable()
export class NotificationBroadcastPublisher {
	constructor(
		@inject(SHARED_TYPES.Queue) private readonly queue: Queue,
		@inject(SHARED_TYPES.Logger) private readonly logger: Logger,
	) {}

	public async publish<TPayload>(payload: TPayload): Promise<void> {
		try {
			await this.queue.publish(
				EXCHANGES.NOTIFICATION_BROADCAST,
				payload,
				"fanout",
				false,
			)
			this.logger.info(this, { exchange: EXCHANGES.NOTIFICATION_BROADCAST })
		} catch (error) {
			this.logger.error(this, {
				exchange: EXCHANGES.NOTIFICATION_BROADCAST,
				error,
			})
			throw error
		}
	}
}
