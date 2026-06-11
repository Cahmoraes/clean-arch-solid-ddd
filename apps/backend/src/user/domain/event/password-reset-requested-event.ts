import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface PasswordResetRequestedEventProps {
	userEmail: string
	userName: string
	rawToken: string
}

export class PasswordResetRequestedEvent extends DomainEvent<PasswordResetRequestedEventProps> {
	readonly payload: PasswordResetRequestedEventProps

	constructor(props: PasswordResetRequestedEventProps) {
		super(EVENTS.PASSWORD_RESET_REQUESTED)
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
