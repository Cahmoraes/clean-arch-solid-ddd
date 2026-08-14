import { injectable } from "inversify"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway.js"
import { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error.js"
import type { Temperature } from "@/weather/domain/value-object/current-weather.js"

@injectable()
export class InMemoryWeatherGateway implements WeatherGateway {
	private shouldFail = false
	private temperature: Temperature = { current: 24, min: 18, max: 27 }

	async getCurrentWeather(
		coordinate: Coordinate,
	): Promise<Either<WeatherProviderUnavailableError, Temperature>> {
		if (this.shouldFail) {
			return failure(new WeatherProviderUnavailableError())
		}
		return success(this.temperature)
	}

	simulateProviderUnavailable(): void {
		this.shouldFail = true
	}

	setTemperature(temperature: Temperature): void {
		this.temperature = temperature
	}
}
