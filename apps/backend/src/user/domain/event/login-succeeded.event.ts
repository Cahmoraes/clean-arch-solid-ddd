import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface LoginSucceededEventProps {
	userId: string
	userEmail: string
	userName: string
}

export class LoginSucceededEvent extends DomainEvent<LoginSucceededEventProps> {
	readonly payload: LoginSucceededEventProps

	constructor(props: LoginSucceededEventProps) {
		super(EVENTS.LOGIN_SUCCEEDED)
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
