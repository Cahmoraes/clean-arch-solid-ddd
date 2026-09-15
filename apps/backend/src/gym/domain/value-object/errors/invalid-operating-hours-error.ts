import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidOperatingHoursError extends DomainError {
	public readonly name = "InvalidOperatingHoursError"
	public readonly kind = "validation" as const
}
