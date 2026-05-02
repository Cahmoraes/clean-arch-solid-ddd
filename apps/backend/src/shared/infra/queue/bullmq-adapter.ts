import {
	Queue as BullQueue,
	Worker as BullWorker,
	type JobsOptions,
} from "bullmq"
import { injectable } from "inversify"
import { Redis, type RedisOptions } from "ioredis"
import { env } from "../env"
import type { Queue } from "./queue"

@injectable()
export class BullMQAdapter implements Queue {
	private redis: Redis
	private queues: Map<string, BullQueue>
	private workers: Map<string, BullWorker>

	constructor() {
		this.redis = new Redis(this.redisConfig())
		this.queues = new Map()
		this.workers = new Map()
	}

	private redisConfig(): RedisOptions {
		return {
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			maxRetriesPerRequest: null,
		}
	}

	public async connect(): Promise<void> {
		try {
			await this.redis.ping()
		} catch (error) {
			console.error(error)
		}
	}

	public async publish<TData>(queueName: string, data: TData): Promise<void> {
		const queue = this.getOrCreateQueue(queueName)
		await queue.add(queueName, data, this.queueConfig())
	}

	private queueConfig(): JobsOptions {
		return {
			removeOnComplete: true,
			removeOnFail: 100,
		}
	}

	private getOrCreateQueue(queueName: string): BullQueue {
		const cached = this.queues.get(queueName)
		if (cached) return cached
		const queue = new BullQueue(queueName, { connection: this.redis.options })
		this.queues.set(queueName, queue)
		return queue
	}

	public async consume(
		queueName: string,
		callback: CallableFunction,
	): Promise<void> {
		if (this.workers.has(queueName)) return
		const worker = new BullWorker(
			queueName,
			async (job) => {
				await callback(job)
			},
			{
				connection: this.redis.options,
			},
		)
		this.workers.set(queueName, worker)
	}
}
