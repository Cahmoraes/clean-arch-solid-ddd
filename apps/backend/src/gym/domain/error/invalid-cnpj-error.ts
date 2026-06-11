import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidCNPJError extends DomainError {
	public readonly name = "InvalidCNPJError"
	public readonly kind = "validation" as const

	constructor(message: string, cause?: ErrorOptions) {
		super(`${message}`, cause)
	}
}
