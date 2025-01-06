import { DomainEvent } from './domain-event'
import { EVENTS } from './events'

export interface PasswordChangedEventProps {
  name: string
  email: string
}

export class PasswordChangedEvent extends DomainEvent {
  readonly payload: PasswordChangedEventProps

  constructor(props: PasswordChangedEventProps) {
    super(EVENTS.PASSWORD_CHANGED)
    this.payload = props
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.eventName,
      date: this.date,
      payload: this.payload,
    }
  }
}
