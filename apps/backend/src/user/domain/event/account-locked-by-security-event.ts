import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface AccountLockedBySecurityEventProps {
	userId: string
	userEmail: string
	userName: string
	resetToken: string
}

export class AccountLockedBySecurityEvent extends DomainEvent<AccountLockedBySecurityEventProps> {
	readonly payload: AccountLockedBySecurityEventProps

	constructor(props: AccountLockedBySecurityEventProps) {
		super(EVENTS.ACCOUNT_LOCKED_BY_SECURITY)
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
