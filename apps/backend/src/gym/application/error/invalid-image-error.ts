import { DomainError } from "@/shared/domain/error/domain-error"

export class InvalidImageError extends DomainError {
	public readonly kind = "validation"

	constructor(message = "Invalid image file") {
		super(message)
		this.name = "InvalidImageError"
	}
}
