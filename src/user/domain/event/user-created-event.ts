import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface UserCreatedEventProps {
	name: string
	email: string
}

export class UserCreatedEvent extends DomainEvent<UserCreatedEventProps> {
	readonly payload: UserCreatedEventProps

	constructor(props: UserCreatedEventProps) {
		super(EVENTS.USER_CREATED)
		this.payload = props
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
