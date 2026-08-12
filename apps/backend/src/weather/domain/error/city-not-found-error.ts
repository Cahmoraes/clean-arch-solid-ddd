import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CityNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(cityName: string, errorOptions?: ErrorOptions) {
		super(`City not found: ${cityName}`, errorOptions)
		this.name = "CityNotFoundError"
	}
}
