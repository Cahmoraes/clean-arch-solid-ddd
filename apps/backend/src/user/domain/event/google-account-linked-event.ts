import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface GoogleAccountLinkedEventProps {
	userEmail: string
	googleId: string
}

export class GoogleAccountLinkedEvent extends DomainEvent<GoogleAccountLinkedEventProps> {
	readonly payload: GoogleAccountLinkedEventProps

	constructor(props: GoogleAccountLinkedEventProps) {
		super(EVENTS.GOOGLE_ACCOUNT_LINKED)
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
