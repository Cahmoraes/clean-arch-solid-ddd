import { afterEach, describe, expect, test, vi } from "vitest"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import { OpenMeteoWeatherGateway } from "./open-meteo-weather-gateway.js"

function buildForecast() {
	return {
		current: {
			time: "2026-10-18T15:15",
			temperature_2m: 24,
			apparent_temperature: 22,
			relative_humidity_2m: 64,
			is_day: 1,
			weather_code: 1,
			wind_speed_10m: 12,
			wind_direction_10m: 45,
		},
		hourly: {
			time: Array.from({ length: 168 }, (_, i) =>
				new Date(Date.UTC(2026, 9, 18, i)).toISOString().slice(0, 16),
			),
			temperature_2m: Array.from({ length: 168 }, (_, i) => i),
			weather_code: Array.from({ length: 168 }, () => 3),
			is_day: Array.from({ length: 168 }, (_, i) =>
				i % 24 >= 6 && i % 24 < 18 ? 1 : 0,
			),
		},
		daily: {
			time: Array.from({ length: 7 }, (_, i) => `2026-10-${18 + i}`),
			weather_code: [1, 2, 3, 45, 61, 71, 95],
			temperature_2m_max: Array.from({ length: 7 }, (_, i) => 27 + i),
			temperature_2m_min: Array.from({ length: 7 }, (_, i) => 18 + i),
		},
	}
}

function stubForecast(body: unknown) {
	const fetchMock = vi.fn(async () => ({ ok: true, json: async () => body }))
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

const gateway = new OpenMeteoWeatherGateway()
const coordinate = Coordinate.create({
	latitude: -23.5505,
	longitude: -46.6333,
}).force.success().value

describe("OpenMeteoWeatherGateway", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	test("AC-02: deve começar o array horário na hora atual local da cidade e devolver 24 itens em ordem crescente", async () => {
		const fetchMock = stubForecast(buildForecast())

		const report = (await gateway.getCurrentWeather(coordinate)).force.success()
			.value

		expect(report.hourly).toHaveLength(24)
		expect(report.hourly[0]).toEqual({
			time: "2026-10-18T15:00",
			temperature: 15,
			code: 3,
			isDay: true,
		})
		expect(report.hourly[9]).toMatchObject({
			time: "2026-10-19T00:00",
			isDay: false,
		})
		expect(report.hourly[23].time).toBe("2026-10-19T14:00")
		const times = report.hourly.map((hour) => hour.time)
		expect(times).toEqual([...times].sort())
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	test("deve traduzir condição, sensação, umidade, vento e os 7 dias do provedor", async () => {
		stubForecast(buildForecast())

		const report = (await gateway.getCurrentWeather(coordinate)).force.success()
			.value

		expect(report.temperature).toEqual({
			current: 24,
			apparent: 22,
			min: 18,
			max: 27,
		})
		expect(report.condition).toEqual({ code: 1, isDay: true })
		expect(report.humidity).toBe(64)
		expect(report.wind).toEqual({ speed: 12, directionDegrees: 45 })
		expect(report.daily).toHaveLength(7)
		expect(report.daily[0]).toEqual({
			date: "2026-10-18",
			min: 18,
			max: 27,
			code: 1,
		})
		expect(report.daily[6]).toEqual({
			date: "2026-10-24",
			min: 24,
			max: 33,
			code: 95,
		})
	})

	test("Review Focus: deve falhar com WeatherProviderUnavailableError quando a hora atual não está no array horário", async () => {
		const forecast = buildForecast()
		forecast.current.time = "2026-11-01T15:15"
		stubForecast(forecast)

		const result = await gateway.getCurrentWeather(coordinate)

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})

	test("Review Focus: deve falhar quando restam menos de 24 horas a partir da hora atual", async () => {
		const forecast = buildForecast()
		forecast.current.time = "2026-10-24T15:15"
		stubForecast(forecast)

		const result = await gateway.getCurrentWeather(coordinate)

		expect(result.isFailure()).toBe(true)
	})

	test.each([
		[
			"hourly",
			(f: ReturnType<typeof buildForecast>) => {
				;(f.hourly.temperature_2m as (number | null)[])[20] = null
			},
		],
		[
			"daily",
			(f: ReturnType<typeof buildForecast>) => {
				;(f.daily.temperature_2m_max as (number | null)[])[3] = null
			},
		],
		[
			"current",
			(f: ReturnType<typeof buildForecast>) => {
				;(f.current as Record<string, unknown>).wind_speed_10m = null
			},
		],
	])("Review Focus: deve falhar com WeatherProviderUnavailableError quando %s traz null", async (_name, corrupt) => {
		const forecast = buildForecast()
		corrupt(forecast)
		stubForecast(forecast)

		const result = await gateway.getCurrentWeather(coordinate)

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})

	test("falha com WeatherProviderUnavailableError quando a API responde com erro", async () => {
		vi.useFakeTimers()
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: false,
				status: 500,
				json: async () => ({}),
			})),
		)
		const gateway = new OpenMeteoWeatherGateway()
		const coordinate = Coordinate.create({
			latitude: -23.5505,
			longitude: -46.6333,
		}).force.success().value

		const resultPromise = gateway.getCurrentWeather(coordinate)
		await vi.advanceTimersByTimeAsync(2000)
		const result = await resultPromise

		// A CircuitBreaker eh compartilhada entre as 3 tentativas do Retry.
		// Apos a 1a falha, failureThreshold (1/1 = 100% > 50%) abre o circuito
		// imediatamente, entao as tentativas 2 e 3 sao bloqueadas por
		// OpenCircleError sem nunca chegar a fetchForecast/fetch de novo.
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})
})
