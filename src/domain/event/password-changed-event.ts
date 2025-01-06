import { randomUUID } from 'crypto'

import type { DomainEvent } from './domain-event'

export interface PasswordChangedEventProps {
  name: string
  email: string
}

export class PasswordChangedEvent implements DomainEvent {
  readonly id: string
  readonly name: string
  readonly date: Date
  readonly payload: PasswordChangedEventProps

  constructor(props: PasswordChangedEventProps) {
    this.id = randomUUID()
    this.name = 'PasswordChangedEvent'
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
