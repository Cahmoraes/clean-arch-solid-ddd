import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import type { Either } from "@/shared/domain/value-object/either.js"
import type { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error.js"
import type { Temperature } from "@/weather/domain/value-object/current-weather.js"

export interface WeatherGateway {
	getCurrentWeather(
		coordinate: Coordinate,
	): Promise<Either<WeatherProviderUnavailableError, Temperature>>
}
