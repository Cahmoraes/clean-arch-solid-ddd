import { injectable } from "inversify"
import { requires } from "@/shared/domain/requires"
import { LazyInject } from "../decorator/lazy-inject"
import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import type { Queue } from "./queue"

@injectable()
export class QueueMemoryAdapter implements Queue {
	public queues: Map<string, CallableFunction[]> = new Map()
	private readonly logger: Logger = LazyInject(SHARED_TYPES.Logger)

	public async connect(): Promise<void> {
		this.logger.info(this, "QueueMemoryAdapter connected 1")
		this.logger.info(this, "QueueMemoryAdapter connected 2")
	}

	public async publish<TData>(exchange: string, data: TData): Promise<void> {
		if (!this.queues.has(exchange)) {
			this.queues.set(exchange, [])
		}
		const exchanges = this.queues.get(exchange)
		requires(exchanges, "[QueueMemoryAdapter] Exchanges should not be null")
		for (const callback of exchanges) {
			callback(data)
		}
	}

	public async consume(
		queueName: string,
		callback: CallableFunction,
	): Promise<void> {
		if (!this.queues.has(queueName)) {
			this.queues.set(queueName, [])
		}
		const queue = this.queues.get(queueName)
		requires(queue, "[QueueMemoryAdapter] Queue should not be null")
		queue.push(callback)
	}
}
