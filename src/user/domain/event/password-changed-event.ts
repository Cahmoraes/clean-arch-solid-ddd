import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface PasswordChangedEventProps {
	name: string
	email: string
}

export class PasswordChangedEvent extends DomainEvent<PasswordChangedEventProps> {
	readonly payload: PasswordChangedEventProps

	constructor(props: PasswordChangedEventProps) {
		super(EVENTS.PASSWORD_CHANGED)
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
