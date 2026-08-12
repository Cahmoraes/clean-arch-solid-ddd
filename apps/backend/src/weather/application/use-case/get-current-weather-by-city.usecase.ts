import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types.js"
import type { GeocodingGateway } from "@/weather/application/gateway/geocoding-gateway.js"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway.js"
import type { CityNotFoundError } from "@/weather/domain/error/city-not-found-error.js"
import type { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error.js"
import type { CurrentWeather } from "@/weather/domain/value-object/current-weather.js"

export interface GetCurrentWeatherByCityInput {
	city: string
}

export type GetCurrentWeatherByCityOutput = Either<
	CityNotFoundError | WeatherProviderUnavailableError,
	CurrentWeather
>

@injectable()
export class GetCurrentWeatherByCityUseCase {
	constructor(
		@inject(WEATHER_TYPES.GATEWAYS.Geocoding)
		private readonly geocodingGateway: GeocodingGateway,
		@inject(WEATHER_TYPES.GATEWAYS.Weather)
		private readonly weatherGateway: WeatherGateway,
	) {}

	public async execute(
		input: GetCurrentWeatherByCityInput,
	): Promise<GetCurrentWeatherByCityOutput> {
		const coordinateOrError = await this.geocodingGateway.geocode(input.city)
		if (coordinateOrError.isFailure()) {
			return failure(coordinateOrError.value)
		}
		const temperatureOrError = await this.weatherGateway.getCurrentWeather(
			coordinateOrError.value,
		)
		if (temperatureOrError.isFailure()) {
			return failure(temperatureOrError.value)
		}
		return success({
			city: input.city,
			temperature: temperatureOrError.value,
		})
	}
}
