import { DomainEvent } from '@/shared/domain/event/domain-event'
import { EVENTS } from '@/shared/domain/event/events'

export interface UserProfileUpdatedEventProps {
  name: string
  email: string
}

export class UserProfileUpdatedEvent extends DomainEvent<UserProfileUpdatedEventProps> {
  readonly payload: UserProfileUpdatedEventProps

  constructor(props: UserProfileUpdatedEventProps) {
    super(EVENTS.USER_PROFILE_UPDATED)
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
