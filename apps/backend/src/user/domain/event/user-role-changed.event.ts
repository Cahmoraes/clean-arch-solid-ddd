import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"
import type { RoleTypes } from "@/user/domain/value-object/role"

export interface UserRoleChangedEventProps {
	userId: string
	userEmail: string
	userName: string
	previousRole: RoleTypes
	newRole: RoleTypes
}

export class UserRoleChangedEvent extends DomainEvent<UserRoleChangedEventProps> {
	readonly payload: UserRoleChangedEventProps

	constructor(props: UserRoleChangedEventProps) {
		super(EVENTS.USER_ROLE_CHANGED)
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
