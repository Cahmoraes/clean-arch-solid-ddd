import amqp, {
	type Channel,
	type ChannelWrapper,
} from "amqp-connection-manager"
import type { ConsumeMessage } from "amqplib"
import { inject, injectable } from "inversify"
import { env } from "@/shared/infra/env"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { SseManager } from "../sse/sse-manager"

/**
 * Assina a exchange fanout `notificationBroadcast` via uma fila exclusiva e
 * auto-delete, declarada dentro do `setup` passado a `createChannel`. O
 * amqp-connection-manager reexecuta esse `setup` a cada reconexão TCP,
 * garantindo que a fila seja redeclarada automaticamente sem configuração
 * manual (FR-002/003/004).
 */
@injectable()
export class NotificationBroadcastSubscriber {
	private channelWrapper?: ChannelWrapper

	constructor(
		@inject(NOTIFICATION_TYPES.Infra.SseManager)
		private readonly sseManager: SseManager,
		@inject(SHARED_TYPES.Logger) private readonly logger: Logger,
	) {}

	public async start(): Promise<void> {
		const connection = amqp.connect([env.AMQP_URL])
		this.channelWrapper = connection.createChannel({
			setup: async (channel: Channel) => {
				await channel.assertExchange(
					EXCHANGES.NOTIFICATION_BROADCAST,
					"fanout",
					{ durable: false },
				)
				const { queue } = await channel.assertQueue("", {
					exclusive: true,
					autoDelete: true,
				})
				await channel.bindQueue(queue, EXCHANGES.NOTIFICATION_BROADCAST, "")
				await channel.consume(queue, (msg: ConsumeMessage | null) =>
					this.handleMessage(channel, msg),
				)
			},
		})
		await this.channelWrapper.waitForConnect()
	}

	public async stop(): Promise<void> {
		await this.channelWrapper?.close()
	}

	private handleMessage(channel: Channel, msg: ConsumeMessage | null): void {
		if (!msg) return
		try {
			const payload = JSON.parse(msg.content.toString())
			this.sseManager.send(payload.userId, { type: "notification", payload })
		} catch (error) {
			this.logger.error(this, {
				exchange: EXCHANGES.NOTIFICATION_BROADCAST,
				error,
			})
		} finally {
			channel.ack(msg)
		}
	}
}
