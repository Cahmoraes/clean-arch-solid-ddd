import { injectable } from "inversify"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway.js"
import { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error.js"
import type {
	Temperature,
	WeatherReport,
} from "@/weather/domain/value-object/current-weather.js"

function buildDefaultReport(): WeatherReport {
	return {
		temperature: { current: 24, apparent: 22, min: 18, max: 27 },
		condition: { code: 1, isDay: true },
		humidity: 64,
		wind: { speed: 12, directionDegrees: 45 },
		hourly: Array.from({ length: 24 }, (_, i) => ({
			time: new Date(Date.UTC(2026, 9, 18, 15 + i)).toISOString().slice(0, 16),
			temperature: 24,
			code: 1,
			isDay: true,
		})),
		daily: Array.from({ length: 7 }, (_, i) => ({
			date: `2026-10-${18 + i}`,
			min: 18,
			max: 27,
			code: 1,
		})),
	}
}

@injectable()
export class InMemoryWeatherGateway implements WeatherGateway {
	private shouldFail = false
	private report: WeatherReport = buildDefaultReport()

	public async getCurrentWeather(
		_coordinate?: Coordinate,
	): Promise<Either<WeatherProviderUnavailableError, WeatherReport>> {
		if (this.shouldFail) {
			return failure(new WeatherProviderUnavailableError())
		}
		return success(this.report)
	}

	public simulateProviderUnavailable(): void {
		this.shouldFail = true
	}

	public setTemperature(temperature: Temperature): void {
		this.report = { ...this.report, temperature }
	}
}
