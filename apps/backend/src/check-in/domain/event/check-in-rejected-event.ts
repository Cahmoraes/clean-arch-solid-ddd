import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { EVENTS } from "@/shared/domain/event/events.js"

export interface CheckInRejectedEventProps {
	checkInId: string
	userId: string
	gymId: string
}

export class CheckInRejectedEvent extends DomainEvent<CheckInRejectedEventProps> {
	payload: CheckInRejectedEventProps

	constructor(props: CheckInRejectedEventProps) {
		super(EVENTS.CHECK_IN_REJECTED)
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
