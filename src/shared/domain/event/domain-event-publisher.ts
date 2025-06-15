import ExtendedSet from '@cahmoraes93/extended-set'

import type { DomainEvent } from './domain-event'
import type { EventTypes } from './events'

export interface Subscriber<T> {
  (event: DomainEvent<T>): Promise<void>
}

export class DomainEventPublisher {
  private static _instance: DomainEventPublisher
  private readonly subscribers: Map<string, ExtendedSet<Subscriber<any>>>

  private constructor() {
    this.subscribers = new Map()
  }

  static get instance(): DomainEventPublisher {
    if (!this._instance) {
      this._instance = new DomainEventPublisher()
    }
    return this._instance
  }

  public subscribe(event: EventTypes, subscriber: Subscriber<any>): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new ExtendedSet())
    }
    this.subscribers.get(event)?.add(subscriber)
  }

  public unsubscribe(event: EventTypes, subscriber: Subscriber<unknown>): void {
    if (!this.subscribers.has(event)) return
    const subscribers = this.subscribers.get(event)!
    subscribers.delete(subscriber)
  }

  public publish<T>(event: DomainEvent<T>): void {
    if (!this.subscribers.has(event.eventName)) return
    const subscribers = this.subscribers.get(event.eventName)!
    for (const subscriber of subscribers) {
      subscriber(event)
    }
  }
}
