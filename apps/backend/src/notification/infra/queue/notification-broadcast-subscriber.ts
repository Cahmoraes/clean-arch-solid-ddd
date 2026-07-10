import type {
	Channel,
	ChannelWrapper,
	connect,
	AmqpConnectionManager as IAmqpConnectionManager,
} from "amqp-connection-manager"
import type { ConsumeMessage } from "amqplib"
import { inject, injectable } from "inversify"
import { env } from "@/shared/infra/env"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { SseManager } from "../sse/sse-manager"

type AmqpConnect = typeof connect

/**
 * Assina a exchange fanout `notificationBroadcast` via uma fila exclusiva e
 * auto-delete, declarada dentro do `setup` passado a `createChannel`. O
 * amqp-connection-manager reexecuta esse `setup` a cada reconexão TCP,
 * garantindo que a fila seja redeclarada automaticamente sem configuração
 * manual (FR-002/003/004).
 *
 * `connect` é recebido via injeção (não importado diretamente do pacote)
 * para que os testes possam substituir a conexão real por um fake passado
 * no construtor, sem depender de module mocking — que quebra quando este
 * binding é carregado antecipadamente pelo setup global de testes
 * (`test/setup-test.ts` importa o container inteiro para fins de rebind).
 */
@injectable()
export class NotificationBroadcastSubscriber {
	private channelWrapper?: ChannelWrapper

	constructor(
		@inject(NOTIFICATION_TYPES.Infra.SseManager)
		private readonly sseManager: SseManager,
		@inject(SHARED_TYPES.Logger) private readonly logger: Logger,
		@inject(NOTIFICATION_TYPES.Infra.AmqpConnect)
		private readonly connect: AmqpConnect,
	) {}

	public async start(): Promise<void> {
		const connection: IAmqpConnectionManager = this.connect([env.AMQP_URL])
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
