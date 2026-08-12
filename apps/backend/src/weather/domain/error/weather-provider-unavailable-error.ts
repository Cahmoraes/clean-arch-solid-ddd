import { DomainError } from "@/shared/domain/error/domain-error.js"

export class WeatherProviderUnavailableError extends DomainError {
	// kind é exigido pela classe base mas não é usado para decidir o status HTTP:
	// WeatherController.mapResponseError() (task-10) sempre intercepta este erro antes
	// do mapeamento genérico por kind (nenhum ErrorKind existente corresponde a 503).
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Weather provider unavailable", errorOptions)
		this.name = "WeatherProviderUnavailableError"
	}
}
