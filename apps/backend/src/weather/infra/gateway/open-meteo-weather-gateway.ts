import { injectable } from "inversify"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { CircuitBreaker } from "@/shared/infra/gateway/circuit-breaker.js"
import { Retry } from "@/shared/infra/gateway/retry.js"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway.js"
import { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error.js"
import type { Temperature } from "@/weather/domain/value-object/current-weather.js"

interface OpenMeteoForecastResponse {
	current: { temperature_2m: number }
	daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
}

@injectable()
export class OpenMeteoWeatherGateway implements WeatherGateway {
	private readonly baseUrl = "https://api.open-meteo.com/v1/forecast"
	// CircuitBreaker is built ONCE here (instance field) so its failure
	// count / open state accumulate across every getCurrentWeather() call,
	// as a real circuit breaker must. `coordinate` is a real per-call
	// argument forwarded through `breaker.run(coordinate)`, not a shared
	// mutable field: each getCurrentWeather() invocation has its own local
	// `coordinate` parameter, so concurrent calls for different coordinates
	// can never clobber each other, even across the Retry suspension point
	// during `sleep`.
	private readonly breaker = CircuitBreaker.wrap({
		callback: (coordinate: Coordinate) => this.fetchForecast(coordinate),
		failureThresholdPercentageLimit: 50,
		resetTimeout: 30_000,
	})

	async getCurrentWeather(
		coordinate: Coordinate,
	): Promise<Either<WeatherProviderUnavailableError, Temperature>> {
		try {
			const retry = Retry.wrap({
				callback: () => this.breaker.run(coordinate),
				maxAttempts: 3,
				time: 500,
			})
			const data: OpenMeteoForecastResponse = await retry.run()
			return success({
				current: data.current.temperature_2m,
				min: data.daily.temperature_2m_min[0],
				max: data.daily.temperature_2m_max[0],
			})
		} catch {
			return failure(new WeatherProviderUnavailableError())
		}
	}

	private async fetchForecast(
		coordinate: Coordinate,
	): Promise<OpenMeteoForecastResponse> {
		const url =
			`${this.baseUrl}?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}` +
			"&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(
				`Open-Meteo forecast request failed with status ${response.status}`,
			)
		}
		return response.json() as Promise<OpenMeteoForecastResponse>
	}
}
