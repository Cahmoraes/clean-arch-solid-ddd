import { injectable } from 'inversify'

import type { Queue } from './queue'

@injectable()
export class QueueMemoryAdapter implements Queue {
  public queues: Map<string, CallableFunction[]> = new Map()

  async connect(): Promise<void> {
    console.log('QueueMemoryAdapter connected')
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
