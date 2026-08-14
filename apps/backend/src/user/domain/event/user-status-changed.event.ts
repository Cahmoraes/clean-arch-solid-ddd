import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface UserStatusChangedEventProps {
	userId: string
	userEmail: string
	userName: string
	previousStatus: StatusTypes
	newStatus: StatusTypes
}

export class UserStatusChangedEvent extends DomainEvent<UserStatusChangedEventProps> {
	readonly payload: UserStatusChangedEventProps

	constructor(props: UserStatusChangedEventProps) {
		super(EVENTS.USER_STATUS_CHANGED)
		this.payload = props
	}

	public toJSON() {
		return {
			id: this.id,
			eventName: this.eventName,
			date: this.date,
			payload: this.payload,
		}
	}
}
