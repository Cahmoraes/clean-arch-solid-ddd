import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { EVENTS } from "@/shared/domain/event/events.js"

export interface CheckInApprovedEventProps {
	checkInId: string
	userId: string
	gymId: string
}

export class CheckInApprovedEvent extends DomainEvent<CheckInApprovedEventProps> {
	payload: CheckInApprovedEventProps

	constructor(props: CheckInApprovedEventProps) {
		super(EVENTS.CHECK_IN_APPROVED)
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
