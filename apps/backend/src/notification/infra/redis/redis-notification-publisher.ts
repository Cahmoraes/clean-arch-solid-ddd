import { injectable } from "inversify"
import IORedis from "ioredis"

import { env } from "@/shared/infra/env/index.js"

@injectable()
export class RedisNotificationPublisher {
	private readonly client: IORedis

	constructor() {
		this.client = new IORedis({
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			enableOfflineQueue: false,
			lazyConnect: true,
		})
	}

	public async publish(channel: string, message: string): Promise<void> {
		await this.ensureConnected()
		await this.client.publish(channel, message)
	}

	public async disconnect(): Promise<void> {
		if (this.client.status === "wait" || this.client.status === "end") {
			return
		}
		await this.client.quit()
	}

	private connectingPromise: Promise<void> | null = null

	private async ensureConnected(): Promise<void> {
		if (this.client.status === "end") {
			throw new Error("RedisNotificationPublisher is disconnected")
		}
		if (this.client.status !== "wait") return
		if (!this.connectingPromise) {
			this.connectingPromise = this.client.connect().finally(() => {
				this.connectingPromise = null
			})
		}
		await this.connectingPromise
	}
}
