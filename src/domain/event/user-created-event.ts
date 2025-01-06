import { DomainEvent } from './domain-event'
import { EVENTS } from './events'

export interface UserCreatedEventProps {
  name: string
  email: string
}

export class UserCreatedEvent extends DomainEvent {
  readonly payload: UserCreatedEventProps

  constructor(props: UserCreatedEventProps) {
    super(EVENTS.USER_CREATED)
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
