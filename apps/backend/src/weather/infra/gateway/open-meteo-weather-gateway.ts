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
import type { WeatherReport } from "@/weather/domain/value-object/current-weather.js"

interface OpenMeteoForecastResponse {
	current: {
		time: string
		temperature_2m: number | null
		apparent_temperature: number | null
		relative_humidity_2m: number | null
		is_day: number | null
		weather_code: number | null
		wind_speed_10m: number | null
		wind_direction_10m: number | null
	}
	hourly: {
		time: string[]
		temperature_2m: (number | null)[]
		weather_code: (number | null)[]
		is_day: (number | null)[]
	}
	daily: {
		time: string[]
		weather_code: (number | null)[]
		temperature_2m_max: (number | null)[]
		temperature_2m_min: (number | null)[]
	}
}

const HOURS_AHEAD = 24
const FORECAST_DAYS = 7

function finite(value: number | null | undefined, field: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`Open-Meteo returned an invalid value for ${field}`)
	}
	return value
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
	): Promise<Either<WeatherProviderUnavailableError, WeatherReport>> {
		try {
			const retry = Retry.wrap({
				callback: () => this.breaker.run(coordinate),
				maxAttempts: 3,
				time: 500,
			})
			const data: OpenMeteoForecastResponse = await retry.run()
			return success(this.toWeatherReport(data))
		} catch {
			return failure(new WeatherProviderUnavailableError())
		}
	}

	private toWeatherReport(data: OpenMeteoForecastResponse): WeatherReport {
		const { current, hourly, daily } = data
		const startIndex = hourly.time.indexOf(`${current.time.slice(0, 13)}:00`)
		if (startIndex === -1 || hourly.time.length - startIndex < HOURS_AHEAD) {
			throw new Error("Open-Meteo hourly data does not cover the current hour")
		}
		if (daily.time.length < FORECAST_DAYS) {
			throw new Error("Open-Meteo daily data is incomplete")
		}
		const dayRange = (index: number) => ({
			min: finite(daily.temperature_2m_min[index], `daily.min[${index}]`),
			max: finite(daily.temperature_2m_max[index], `daily.max[${index}]`),
		})
		return {
			temperature: {
				current: finite(current.temperature_2m, "current.temperature_2m"),
				apparent: finite(
					current.apparent_temperature,
					"current.apparent_temperature",
				),
				...dayRange(0),
			},
			condition: {
				code: finite(current.weather_code, "current.weather_code"),
				isDay: finite(current.is_day, "current.is_day") === 1,
			},
			humidity: finite(
				current.relative_humidity_2m,
				"current.relative_humidity_2m",
			),
			wind: {
				speed: finite(current.wind_speed_10m, "current.wind_speed_10m"),
				directionDegrees: finite(
					current.wind_direction_10m,
					"current.wind_direction_10m",
				),
			},
			hourly: Array.from({ length: HOURS_AHEAD }, (_, offset) => {
				const index = startIndex + offset
				return {
					time: hourly.time[index],
					temperature: finite(
						hourly.temperature_2m[index],
						`hourly.temperature_2m[${index}]`,
					),
					code: finite(hourly.weather_code[index], `hourly.weather_code[${index}]`),
					isDay: finite(hourly.is_day[index], `hourly.is_day[${index}]`) === 1,
				}
			}),
			daily: Array.from({ length: FORECAST_DAYS }, (_, index) => ({
				date: daily.time[index],
				...dayRange(index),
				code: finite(daily.weather_code[index], `daily.weather_code[${index}]`),
			})),
		}
	}

	private async fetchForecast(
		coordinate: Coordinate,
	): Promise<OpenMeteoForecastResponse> {
		const url =
			`${this.baseUrl}?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}` +
			"&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m" +
			"&hourly=temperature_2m,weather_code,is_day" +
			"&daily=weather_code,temperature_2m_max,temperature_2m_min" +
			`&forecast_days=${FORECAST_DAYS}&timezone=auto`
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(
				`Open-Meteo forecast request failed with status ${response.status}`,
			)
		}
		return response.json() as Promise<OpenMeteoForecastResponse>
	}
}
