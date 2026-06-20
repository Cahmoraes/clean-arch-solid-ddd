import { DomainError } from "@/shared/domain/error/domain-error"

export class NotAllowedToManageUserError extends DomainError {
	public readonly kind = "forbidden" as const

	constructor(errorOptions?: ErrorOptions) {
		super("You are not allowed to manage this user", errorOptions)
		this.name = "NotAllowedToManageUserError"
	}
}
