import { DomainEvent } from './domain-event'
import { EVENTS } from './events'

export interface CheckInCreateEventProps {
  checkInId: string
  userId: string
  gymId: string
}

export class CheckInCreatedEvent extends DomainEvent<CheckInCreateEventProps> {
  payload: CheckInCreateEventProps

  constructor(props: CheckInCreateEventProps) {
    super(EVENTS.CHECK_IN_CREATED)
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
