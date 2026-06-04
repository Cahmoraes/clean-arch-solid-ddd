import { inject, injectable } from "inversify"
import IORedis from "ioredis"

import type { NotificationCreatedPayload } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler.js"
import { env } from "@/shared/infra/env/index.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"
import type { SseManager } from "../sse/sse-manager.js"

const NOTIFICATION_CHANNEL_PATTERN = "notifications:*"
const NOTIFICATION_CHANNEL_PREFIX = "notifications:"

@injectable()
export class RedisNotificationSubscriber {
	private readonly client: IORedis
	private isSubscribed = false

	constructor(
		@inject(NOTIFICATION_TYPES.Infra.SseManager)
		private readonly sseManager: SseManager,
	) {
		this.client = new IORedis({
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			enableOfflineQueue: false,
			lazyConnect: true,
		})
	}

	public async subscribe(): Promise<void> {
		await this.ensureConnected()
		this.client.removeAllListeners("pmessage")
		this.client.on("pmessage", this.handleMessage)
		await this.client.psubscribe(NOTIFICATION_CHANNEL_PATTERN)
		this.isSubscribed = true
	}

	public async disconnect(): Promise<void> {
		if (this.client.status === "wait" || this.client.status === "end") {
			return
		}
		this.client.removeListener("pmessage", this.handleMessage)
		if (this.isSubscribed) {
			await this.client.punsubscribe(NOTIFICATION_CHANNEL_PATTERN)
			this.isSubscribed = false
		}
		await this.client.quit()
	}

	private connectingPromise: Promise<void> | null = null

	private async ensureConnected(): Promise<void> {
		if (this.client.status === "end") {
			throw new Error("RedisNotificationSubscriber is disconnected")
		}
		if (this.client.status !== "wait") return
		if (!this.connectingPromise) {
			this.connectingPromise = this.client.connect().finally(() => {
				this.connectingPromise = null
			})
		}
		await this.connectingPromise
	}

	private readonly handleMessage = (
		_pattern: string,
		channel: string,
		message: string,
	): void => {
		const userId = channel.replace(NOTIFICATION_CHANNEL_PREFIX, "")
		try {
			const payload = JSON.parse(message) as NotificationCreatedPayload
			this.sseManager.send(userId, { type: "notification", payload })
		} catch (error) {
			console.error(
				"[RedisNotificationSubscriber] Failed to parse message:",
				error,
			)
		}
	}
}
