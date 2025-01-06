import { randomUUID } from 'crypto'

export abstract class DomainEvent {
  readonly id: string
  readonly eventName: string
  readonly date: Date

  constructor(eventName: string) {
    this.id = randomUUID()
    this.eventName = eventName
    this.date = new Date()
  }
  public abstract toJSON(): Record<string, unknown>
}
