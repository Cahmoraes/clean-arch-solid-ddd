import type { Coordinate } from "@/shared/domain/value-object/coordinate"
import type { Either } from "@/shared/domain/value-object/either"
import type { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error"
import type { Temperature } from "@/weather/domain/value-object/current-weather"

export interface WeatherGateway {
	getCurrentWeather(
		coordinate: Coordinate,
	): Promise<Either<WeatherProviderUnavailableError, Temperature>>
}
