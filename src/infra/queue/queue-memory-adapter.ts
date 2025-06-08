import { injectable } from 'inversify'

import { LazyInject } from '../decorator/lazy-inject'
import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { Queue } from './queue'

@injectable()
export class QueueMemoryAdapter implements Queue {
  public queues: Map<string, CallableFunction[]> = new Map()
  private readonly logger: Logger = LazyInject(TYPES.Logger)

  async connect(): Promise<void> {
    this.logger.info(this, 'QueueMemoryAdapter connected')
  }

  async publish<TData>(exchange: string, data: TData): Promise<void> {
    if (!this.queues.has(exchange)) {
      this.queues.set(exchange, [])
    }
    for (const callback of this.queues.get(exchange)!) {
      callback(data)
    }
  }

  async consume(queue: string, callback: CallableFunction): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }
    this.queues.get(queue)!.push(callback)
  }
}
