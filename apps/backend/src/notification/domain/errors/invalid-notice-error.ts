import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidNoticeError extends DomainError {
	public readonly kind = "validation" as const

	constructor(message: string) {
		super(message)
		this.name = "InvalidNoticeError"
	}
}
