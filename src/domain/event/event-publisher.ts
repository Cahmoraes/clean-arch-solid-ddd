import ExtendedSet from '@cahmoraes93/extended-set'

import type { DomainEvent } from './domain-event'

export class DomainEventPublisher {
  private static _instance: DomainEventPublisher
  private readonly subscribers: ExtendedSet<CallableFunction>

  private constructor() {
    this.subscribers = new ExtendedSet()
  }

  static get instance(): DomainEventPublisher {
    if (!this._instance) {
      this._instance = new DomainEventPublisher()
    }
    return this._instance
  }

  public subscribe(subscriber: CallableFunction): void {
    this.subscribers.add(subscriber)
  }

  public unsubscribe(subscriber: CallableFunction): void {
    this.subscribers.delete(subscriber)
  }

  public async publish(event: DomainEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      await subscriber(event)
      this.unsubscribe(subscriber)
    }
  }
}
