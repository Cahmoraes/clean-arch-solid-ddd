import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface UserAssignedBillingCustomerIdProps {
	userEmail: string
}

export class UserAssignedBillingCustomerIdEvent extends DomainEvent<UserAssignedBillingCustomerIdProps> {
	readonly payload: UserAssignedBillingCustomerIdProps

	constructor(props: UserAssignedBillingCustomerIdProps) {
		super(EVENTS.USER_ASSIGNED_BILLING_CUSTOMER_ID)
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
