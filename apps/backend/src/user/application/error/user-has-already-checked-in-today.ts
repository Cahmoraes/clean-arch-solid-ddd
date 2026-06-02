import { DomainError } from "@/shared/domain/error/domain-error.js"

export class UserHasAlreadyCheckedInToday extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("User has already checked in today")
		this.name = "UserHasAlreadyCheckedInToday"
	}
}
