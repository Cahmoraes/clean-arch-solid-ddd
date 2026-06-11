import { DomainError } from "@/shared/domain/error/domain-error.js"

export class NotificationNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor() {
		super("Notification not found")
		this.name = "NotificationNotFoundError"
	}
}
