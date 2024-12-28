import { randomUUID } from 'crypto'

import type { DomainEvent } from './domain-event'

export interface UserCreatedEventProps {
  name: string
  email: string
}

export class UserCreatedEvent implements DomainEvent {
  readonly id: string
  readonly name: string
  readonly date: Date
  readonly payload: UserCreatedEventProps

  constructor(props: UserCreatedEventProps) {
    this.id = randomUUID()
    this.name = 'UserCreatedEvent'
    this.payload = props
    this.date = new Date()
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      date: this.date,
      payload: this.payload,
    }
  }
}
